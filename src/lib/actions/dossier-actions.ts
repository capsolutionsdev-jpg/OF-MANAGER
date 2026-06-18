"use server";

import { prisma } from "@/lib/prisma";
import { storeUpload, parseDataUrl, extFromMime } from "@/lib/blob";

const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo / pièce
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export type PieceDTO = {
  id: string;
  label: string;
  categorie: string | null;
  url: string;
  mimeType: string | null;
};

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
      session: { select: { formation: { select: { piecesAttendues: true } } } },
    },
  });
}

/** Pièces déjà déposées par le candidat (réutilisables « depuis le profil »). */
export async function listPiecesParcours(token: string): Promise<{ ok: boolean; pieces: PieceDTO[] }> {
  const insc = await inscriptionByToken(token);
  if (!insc) return { ok: false, pieces: [] };
  const pieces = await prisma.pieceJointe.findMany({
    where: { candidatId: insc.candidatId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, categorie: true, url: true, mimeType: true },
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
  if (!ALLOWED.includes(parsed.mime))
    return { ok: false, error: "Format accepté : PDF, JPEG, PNG ou WebP." };
  if (parsed.data.byteLength > MAX_BYTES)
    return { ok: false, error: "Fichier trop volumineux (max 8 Mo)." };

  const ext = extFromMime(parsed.mime);
  const url = await storeUpload({
    data: parsed.data,
    folder: `dossiers/${insc.candidatId}`,
    ext,
    contentType: parsed.mime,
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
      mimeType: parsed.mime,
      taille: parsed.data.byteLength,
    },
    select: { id: true, label: true, categorie: true, url: true, mimeType: true },
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
