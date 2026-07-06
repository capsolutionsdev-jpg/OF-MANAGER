"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertArchivable } from "@/lib/validation/service";
import type { ManualMark } from "@/lib/validation/types";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
type Result = { ok: true } | { ok: false; error: string };

async function staff(): Promise<{ organismeId: string; nom: string; userId: string }> {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  const userId = session?.user?.id;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId || !userId)
    throw new Error("Non autorisé.");
  return { organismeId, nom: session.user.name || session.user.email || "Collaborateur", userId };
}

/** Piste d'audit : consigne toute action de validation (réutilise AuditLog). */
async function audit(
  organismeId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  changes: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      organismeId, userId, action, entityType, entityId,
      changesJson: changes as Prisma.InputJsonValue,
    },
  });
}

function refresh(sessionId: string) {
  revalidatePath(`/sessions/${sessionId}/validation`);
  revalidatePath(`/sessions/${sessionId}`);
}

const PIECE_PREFIX = "CAND_PIECE::";

/**
 * Valide manuellement un item (collaborateur, après vérification physique).
 * Route selon le type d'item pour écrire dans la BONNE source de vérité :
 *  - CAND_SIGNATURES → signedAt de l'inscription (« signé sur place »)
 *  - CAND_PIECE::<label> → pièce ajoutée à piecesRecues (+ traçabilité)
 *  - autres (session/formateur) → Session.validationJson[itemKey]
 */
export async function validateItem(
  sessionId: string,
  itemKey: string,
  opts?: { inscriptionId?: string; comment?: string },
): Promise<Result> {
  const { organismeId, nom, userId } = await staff();
  const now = new Date();

  // ── Item candidat : signatures ──
  if (itemKey === "CAND_SIGNATURES") {
    if (!opts?.inscriptionId) return { ok: false, error: "Inscription manquante." };
    const insc = await prisma.inscription.findFirst({
      where: { id: opts.inscriptionId, organismeId },
      select: { id: true, formCompletedAt: true },
    });
    if (!insc) return { ok: false, error: "Inscription introuvable." };
    await prisma.inscription.update({
      where: { id: insc.id },
      data: { signedAt: now, signedParNom: nom, formCompletedAt: insc.formCompletedAt ?? now },
    });
    await audit(organismeId, userId, "VALIDATE", "Inscription", insc.id, {
      itemKey, source: "MANUAL", by: nom, comment: opts.comment ?? null,
    });
    refresh(sessionId);
    return { ok: true };
  }

  // ── Item candidat : pièce du dossier ──
  if (itemKey.startsWith(PIECE_PREFIX)) {
    const piece = itemKey.slice(PIECE_PREFIX.length);
    if (!opts?.inscriptionId) return { ok: false, error: "Inscription manquante." };
    const insc = await prisma.inscription.findFirst({
      where: { id: opts.inscriptionId, organismeId },
      select: { id: true, piecesRecues: true, piecesValideePar: true },
    });
    if (!insc) return { ok: false, error: "Inscription introuvable." };
    const recues = insc.piecesRecues.includes(piece)
      ? insc.piecesRecues
      : [...insc.piecesRecues, piece];
    const validePar = {
      ...((insc.piecesValideePar as Record<string, { nom: string; date: string }> | null) ?? {}),
      [piece]: { nom, date: now.toISOString() },
    };
    await prisma.inscription.update({
      where: { id: insc.id },
      data: { piecesRecues: { set: recues }, piecesValideePar: validePar as Prisma.InputJsonValue },
    });
    await audit(organismeId, userId, "VALIDATE", "Inscription", insc.id, {
      itemKey, piece, source: "MANUAL", by: nom, comment: opts.comment ?? null,
    });
    refresh(sessionId);
    return { ok: true };
  }

  // ── Item session / formateur : marque manuelle stockée ──
  const s = await prisma.session.findFirst({
    where: { id: sessionId, organismeId },
    select: { id: true, validationJson: true },
  });
  if (!s) return { ok: false, error: "Session introuvable." };
  const marks = { ...((s.validationJson as Record<string, ManualMark> | null) ?? {}) };
  marks[itemKey] = { nom, userId, date: now.toISOString(), comment: opts?.comment?.trim() || undefined };
  await prisma.session.update({ where: { id: s.id }, data: { validationJson: marks as unknown as Prisma.InputJsonValue } });
  await audit(organismeId, userId, "VALIDATE", "Session", s.id, {
    itemKey, source: "MANUAL", by: nom, comment: opts?.comment ?? null,
  });
  refresh(sessionId);
  return { ok: true };
}

/** Annule une validation manuelle (item session/formateur ou pièce candidat). */
export async function unvalidateItem(
  sessionId: string,
  itemKey: string,
  opts?: { inscriptionId?: string },
): Promise<Result> {
  const { organismeId, nom, userId } = await staff();

  if (itemKey.startsWith(PIECE_PREFIX)) {
    const piece = itemKey.slice(PIECE_PREFIX.length);
    if (!opts?.inscriptionId) return { ok: false, error: "Inscription manquante." };
    const insc = await prisma.inscription.findFirst({
      where: { id: opts.inscriptionId, organismeId },
      select: { id: true, piecesRecues: true, piecesValideePar: true },
    });
    if (!insc) return { ok: false, error: "Inscription introuvable." };
    const validePar = { ...((insc.piecesValideePar as Record<string, unknown> | null) ?? {}) };
    delete validePar[piece];
    await prisma.inscription.update({
      where: { id: insc.id },
      data: {
        piecesRecues: { set: insc.piecesRecues.filter((p) => p !== piece) },
        piecesValideePar: validePar as Prisma.InputJsonValue,
      },
    });
    await audit(organismeId, userId, "UNVALIDATE", "Inscription", insc.id, { itemKey, piece, by: nom });
    refresh(sessionId);
    return { ok: true };
  }

  // Item session / formateur
  const s = await prisma.session.findFirst({
    where: { id: sessionId, organismeId },
    select: { id: true, validationJson: true },
  });
  if (!s) return { ok: false, error: "Session introuvable." };
  const marks = { ...((s.validationJson as Record<string, ManualMark> | null) ?? {}) };
  delete marks[itemKey];
  await prisma.session.update({ where: { id: s.id }, data: { validationJson: marks as unknown as Prisma.InputJsonValue } });
  await audit(organismeId, userId, "UNVALIDATE", "Session", s.id, { itemKey, by: nom });
  refresh(sessionId);
  return { ok: true };
}

/**
 * Archive la session — s'appuie EXCLUSIVEMENT sur le service de validation.
 * Refusé (message spec) tant que la validation n'est pas complète.
 */
export async function archiveSessionValidated(
  sessionId: string,
  comment?: string,
): Promise<Result> {
  const { organismeId, nom, userId } = await staff();
  const check = await assertArchivable(sessionId);
  if (!check.ok) return { ok: false, error: check.error };

  const s = await prisma.session.findFirst({
    where: { id: sessionId, organismeId },
    select: { id: true },
  });
  if (!s) return { ok: false, error: "Session introuvable." };

  await prisma.session.update({
    where: { id: s.id },
    data: { isArchived: true, archivedAt: new Date(), archivedBy: nom, statut: "TERMINEE" },
  });
  await audit(organismeId, userId, "ARCHIVE_SESSION", "Session", s.id, {
    by: nom, percentage: check.state.percentage, comment: comment ?? null,
  });
  refresh(sessionId);
  revalidatePath("/sessions");
  return { ok: true };
}
