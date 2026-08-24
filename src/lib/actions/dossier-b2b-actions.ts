"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb, type TenantDb } from "@/lib/tenant";
import { getCurrentEntreprise } from "@/lib/entreprise-portal";
import { getCurrentApprenant } from "@/lib/candidat-portal";
import { storeUpload, parseDataUrl, extFromMime, detectFileType, isRasterImage } from "@/lib/blob";
import { estPieceAttendue } from "@/lib/dossier/etat";

// Dépôt du dossier administratif par le CLIENT B2B (pour ses salariés) ou par le
// CANDIDAT connecté (pour lui-même). Réutilise l'existant : PieceJointe (candidat)
// + Inscription.piecesRecues, comme le flux tokenisé (dossier-actions.ts). Le staff
// valide/refuse via setPieceStatut (déjà en place).

const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo / pièce (parité flux tokenisé)
type Res = { ok: boolean; error?: string };

async function deposerPiece(
  db: TenantDb,
  opts: { inscriptionId: string; candidatId: string; attendues: string[]; piece: string; dataUrl: string },
): Promise<Res> {
  if (!estPieceAttendue(opts.attendues, opts.piece))
    return { ok: false, error: "Cette pièce n'est pas attendue pour cette formation." };
  const parsed = parseDataUrl(opts.dataUrl);
  if (!parsed) return { ok: false, error: "Fichier illisible." };
  if (parsed.data.byteLength > MAX_BYTES) return { ok: false, error: "Fichier trop volumineux (max 8 Mo)." };
  const detected = detectFileType(parsed.data); // vérif sur les OCTETS (anti-usurpation)
  if (detected !== "application/pdf" && !isRasterImage(detected))
    return { ok: false, error: "Format accepté : PDF, JPEG, PNG ou WebP." };

  const url = await storeUpload({
    data: parsed.data,
    folder: `dossiers/${opts.candidatId}`,
    ext: extFromMime(detected!),
    contentType: detected!,
  });

  // Redépôt : on remplace la pièce du même libellé (repasse en EN_ATTENTE).
  await db.pieceJointe.deleteMany({ where: { candidatId: opts.candidatId, label: opts.piece } });
  await db.pieceJointe.create({
    data: {
      candidatId: opts.candidatId,
      label: opts.piece,
      categorie: "ADMINISTRATIF",
      url,
      mimeType: detected,
      taille: parsed.data.byteLength,
      statut: "EN_ATTENTE",
    },
  });

  // Marque la pièce attendue « reçue » sur l'inscription (checklist staff).
  const insc = await db.inscription.findFirst({ where: { id: opts.inscriptionId }, select: { piecesRecues: true } });
  if (insc && !insc.piecesRecues.includes(opts.piece)) {
    await db.inscription.updateMany({
      where: { id: opts.inscriptionId },
      data: { piecesRecues: { set: [...insc.piecesRecues, opts.piece] } },
    });
  }
  return { ok: true };
}

/** CLIENT B2B : dépose une pièce du dossier d'un de ses salariés (anti-IDOR par entrepriseId). */
export async function uploadPieceClient(inscriptionId: string, piece: string, dataUrl: string): Promise<Res> {
  const entreprise = await getCurrentEntreprise();
  if (!entreprise) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  const insc = await db.inscription.findFirst({
    where: { id: inscriptionId, entrepriseId: entreprise.id },
    select: { id: true, candidatId: true, session: { select: { formation: { select: { piecesAttendues: true } } } } },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };
  const r = await deposerPiece(db, {
    inscriptionId,
    candidatId: insc.candidatId,
    attendues: (insc.session?.formation?.piecesAttendues as string[] | null) ?? [],
    piece,
    dataUrl,
  });
  if (r.ok) revalidatePath("/espace-entreprise/dossiers");
  return r;
}

/** CANDIDAT connecté : dépose une pièce de SON dossier (anti-IDOR par candidatId). */
export async function uploadPieceCandidatCompte(inscriptionId: string, piece: string, dataUrl: string): Promise<Res> {
  const appr = await getCurrentApprenant();
  if (!appr?.candidatId) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  const insc = await db.inscription.findFirst({
    where: { id: inscriptionId, candidatId: appr.candidatId },
    select: { id: true, candidatId: true, session: { select: { formation: { select: { piecesAttendues: true } } } } },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };
  const r = await deposerPiece(db, {
    inscriptionId,
    candidatId: insc.candidatId,
    attendues: (insc.session?.formation?.piecesAttendues as string[] | null) ?? [],
    piece,
    dataUrl,
  });
  if (r.ok) revalidatePath("/mon-dossier");
  return r;
}
