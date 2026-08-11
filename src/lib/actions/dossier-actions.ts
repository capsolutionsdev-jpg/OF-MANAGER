"use server";

import { revalidatePath } from "next/cache";
import { PieceStatut, EmailStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { storeUpload, parseDataUrl, extFromMime, detectFileType, isRasterImage } from "@/lib/blob";
import { orgConfigFor } from "@/lib/org-identity";
import { sendEmail } from "@/lib/email";
import { emailShell, emailParagraph, emailBox, emailSignoff, esc } from "@/lib/email-templates";

const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo / pièce
const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

export type PieceDTO = {
  id: string;
  label: string;
  categorie: string | null;
  url: string;
  mimeType: string | null;
  statut: PieceStatut;
  motifRefus: string | null;
};

const PIECE_SELECT = {
  id: true, label: true, categorie: true, url: true, mimeType: true,
  statut: true, motifRefus: true,
} as const;

/** Résout l'inscription + candidat à partir du token public, sinon null. */
async function inscriptionByToken(token: string) {
  if (!token) return null;
  return prisma.inscription.findUnique({
    where: { accessToken: token },
    select: {
      id: true,
      organismeId: true,
      candidatId: true,
      piecesRecues: true,
      candidat: { select: { prenom: true, nom: true, email: true } },
      session: { select: { formation: { select: { titre: true, piecesAttendues: true } } } },
    },
  });
}

/**
 * Soumission du dossier par le candidat depuis le lien (#9) : notifie le staff
 * par e-mail. Si des pièces attendues manquent, on renvoie la liste et on
 * REFUSE, sauf si `force` (« Envoyer quand même ») — auquel cas on transmet en
 * signalant les pièces manquantes. Best-effort : un souci d'e-mail ne bloque
 * jamais. Pas de colonne dédiée : ré-envoyable.
 */
export async function submitDossierParcours(
  token: string,
  opts?: { force?: boolean },
): Promise<{ ok: boolean; error?: string; incomplete?: boolean; manquantes?: string[] }> {
  const insc = await inscriptionByToken(token);
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };

  const attendues = insc.session.formation.piecesAttendues ?? [];
  const manquantes = attendues.filter((p) => !insc.piecesRecues.includes(p));

  // Pièces manquantes + pas de confirmation → on rend la garde explicite (surchargeable).
  if (manquantes.length > 0 && !opts?.force) {
    return { ok: false, incomplete: true, manquantes };
  }

  // Notification staff (best-effort).
  try {
    const org = await orgConfigFor(insc.organismeId);
    const c = insc.candidat;
    const nom = `${c.prenom} ${c.nom}`.trim();
    const liste = manquantes.length
      ? `<br><b>Pièces manquantes (${manquantes.length})</b> : ${manquantes.map((m) => esc(m)).join(", ")}`
      : "";
    const html = emailShell({
      organisme: org.name,
      representant: org.representant,
      accent: manquantes.length ? undefined : "green",
      body:
        emailParagraph(`Bonjour,`) +
        emailParagraph(
          `<b>${esc(nom)}</b> a transmis son dossier d'inscription pour la formation <b>${esc(insc.session.formation.titre)}</b>.`,
        ) +
        emailBox(
          (manquantes.length
            ? `⚠️ Dossier transmis <b>avec des pièces manquantes</b> — à relancer si besoin.`
            : `✅ Dossier <b>complet</b>.`) + liste,
          manquantes.length ? undefined : "green",
        ) +
        emailSignoff("Notification automatique", org.name),
    });
    if (org.email) {
      const res = await sendEmail({
        to: org.email,
        subject: `📁 Dossier transmis — ${nom}${manquantes.length ? " (incomplet)" : ""}`,
        html,
        organismeId: insc.organismeId,
      });
      await prisma.emailLog.create({
        data: {
          organismeId: insc.organismeId,
          destinataire: org.email,
          sujet: `Dossier transmis — ${nom}`,
          corps: html,
          statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
          sentAt: res.sent ? new Date() : null,
        },
      });
    }
  } catch (e) {
    console.error("[submitDossierParcours] notification staff échouée", e);
  }

  return { ok: true, incomplete: manquantes.length > 0 };
}

/** Pièces déjà déposées par le candidat (réutilisables « depuis le profil »). */
export async function listPiecesParcours(token: string): Promise<{ ok: boolean; pieces: PieceDTO[] }> {
  const insc = await inscriptionByToken(token);
  if (!insc) return { ok: false, pieces: [] };
  const pieces = await prisma.pieceJointe.findMany({
    where: { candidatId: insc.candidatId },
    orderBy: { createdAt: "desc" },
    select: PIECE_SELECT,
  });
  return { ok: true, pieces };
}

/**
 * Dépôt public d'une pièce du dossier administratif (PDF ou image), via le lien
 * tokenisé du candidat. Crée la PieceJointe et marque la pièce attendue « reçue ».
 */
export async function uploadPieceParcours(
  token: string,
  input: { dataUrl: string; filename?: string; piece?: string },
): Promise<{ ok: boolean; error?: string; piece?: PieceDTO }> {
  const insc = await inscriptionByToken(token);
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };

  const parsed = parseDataUrl(input.dataUrl);
  if (!parsed) return { ok: false, error: "Fichier illisible." };
  if (parsed.data.byteLength > MAX_BYTES)
    return { ok: false, error: "Fichier trop volumineux (max 8 Mo)." };
  // Type vérifié sur les OCTETS, pas le MIME annoncé (anti SVG/HTML déguisé).
  const detected = detectFileType(parsed.data);
  if (detected !== "application/pdf" && !isRasterImage(detected))
    return { ok: false, error: "Format accepté : PDF, JPEG, PNG ou WebP." };

  const url = await storeUpload({
    data: parsed.data,
    folder: `dossiers/${insc.candidatId}`,
    ext: extFromMime(detected!),
    contentType: detected!,
  });

  const attendues = insc.session.formation.piecesAttendues ?? [];
  const label = (input.piece && attendues.includes(input.piece))
    ? input.piece
    : (input.filename?.trim() || "Document");

  const piece = await prisma.pieceJointe.create({
    data: {
      organismeId: insc.organismeId,
      candidatId: insc.candidatId,
      label,
      categorie: "ADMINISTRATIF",
      url,
      mimeType: detected!,
      taille: parsed.data.byteLength,
    },
    select: PIECE_SELECT,
  });

  // Marque la pièce attendue comme reçue (côté checklist admin).
  if (input.piece && attendues.includes(input.piece) && !insc.piecesRecues.includes(input.piece)) {
    await prisma.inscription.update({
      where: { id: insc.id },
      data: { piecesRecues: { set: [...insc.piecesRecues, input.piece] } },
    });
  }

  return { ok: true, piece };
}

/** Réutilise une pièce déjà présente au profil pour satisfaire une pièce attendue. */
export async function attachPieceFromProfil(
  token: string,
  pieceId: string,
  piece: string,
): Promise<{ ok: boolean; error?: string }> {
  const insc = await inscriptionByToken(token);
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };
  const exists = await prisma.pieceJointe.findFirst({
    where: { id: pieceId, candidatId: insc.candidatId },
    select: { id: true },
  });
  if (!exists) return { ok: false, error: "Pièce introuvable." };
  const attendues = insc.session.formation.piecesAttendues ?? [];
  if (attendues.includes(piece) && !insc.piecesRecues.includes(piece)) {
    await prisma.inscription.update({
      where: { id: insc.id },
      data: { piecesRecues: { set: [...insc.piecesRecues, piece] } },
    });
  }
  return { ok: true };
}

/** Supprime une pièce déposée par le candidat (token-scoped). */
export async function deletePieceParcours(
  token: string,
  pieceId: string,
): Promise<{ ok: boolean; error?: string }> {
  const insc = await inscriptionByToken(token);
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };
  const piece = await prisma.pieceJointe.findFirst({
    where: { id: pieceId, candidatId: insc.candidatId },
    select: { id: true, label: true },
  });
  if (!piece) return { ok: false, error: "Pièce introuvable." };
  await prisma.pieceJointe.delete({ where: { id: piece.id } });
  // Si plus aucune pièce ne porte ce label, on retire la coche « reçue ».
  const reste = await prisma.pieceJointe.count({
    where: { candidatId: insc.candidatId, label: piece.label },
  });
  if (reste === 0 && insc.piecesRecues.includes(piece.label)) {
    await prisma.inscription.update({
      where: { id: insc.id },
      data: { piecesRecues: { set: insc.piecesRecues.filter((p) => p !== piece.label) } },
    });
  }
  return { ok: true };
}

/** Côté OF : valide ou refuse une pièce du dossier (avec motif si refus). */
export async function setPieceStatut(
  pieceId: string,
  statut: PieceStatut,
  motifRefus?: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string))
    return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb(); // cloisonné par organisme
  const piece = await db.pieceJointe.findUnique({ where: { id: pieceId }, select: { id: true, candidatId: true } });
  if (!piece) return { ok: false, error: "Pièce introuvable." };
  await db.pieceJointe.update({
    where: { id: pieceId },
    data: {
      statut,
      motifRefus: statut === PieceStatut.REFUSEE ? (motifRefus?.trim() || "Pièce non conforme") : null,
    },
  });
  revalidatePath(`/candidats/${piece.candidatId}`);
  return { ok: true };
}
