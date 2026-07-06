// Service serveur uniquement (utilise getTenantDb/Prisma). Importé seulement
// par des composants serveur et des server actions.
import { getTenantDb } from "@/lib/tenant";
import { computeValidation } from "./engine";
import { SessionSnapshot } from "./config";
import { ManualMark, ValidationState } from "./types";

/**
 * Service de validation — point d'entrée UNIQUE pour connaître l'état de
 * validation d'une session. Charge les données réelles (scoping tenant), les
 * normalise en instantané, puis délègue le calcul au moteur pur.
 *
 * L'archivage NE DOIT s'appuyer QUE sur ce service (cf. `assertArchivable`).
 */
export async function getSessionValidation(
  sessionId: string,
): Promise<ValidationState | null> {
  const db = await getTenantDb();
  const s = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      formation: { select: { piecesAttendues: true } },
      formateurs: { select: { id: true } },
      inscriptions: {
        where: { statut: { not: "ANNULEE" } },
        include: { candidat: { select: { id: true, nom: true, prenom: true } } },
        orderBy: { createdAt: "asc" },
      },
      emargementSignatures: { select: { role: true, signedAt: true } },
    },
  });
  if (!s) return null;

  const manualMarks =
    (s.validationJson as Record<string, ManualMark> | null) ?? {};

  const snapshot: SessionSnapshot = {
    sessionId: s.id,
    isArchived: s.isArchived,
    hasFormateur: s.formateurs.length > 0,
    contratFormateurToken: s.contratFormateurToken,
    contratFormateurSentAt: s.contratFormateurSentAt,
    contratFormateurSignedAt: s.contratFormateurSignedAt,
    crFormateurToken: s.crFormateurToken,
    crFormateurSentAt: s.crFormateurSentAt,
    crFormateurCompletedAt: s.crFormateurCompletedAt,
    emargement: s.emargementSignatures.map((e) => ({
      role: e.role,
      signed: !!e.signedAt,
    })),
    piecesAttendues: s.formation.piecesAttendues,
    manualMarks,
    candidates: s.inscriptions.map((i) => ({
      inscriptionId: i.id,
      candidatId: i.candidatId,
      name: `${i.candidat.prenom} ${i.candidat.nom}`.trim(),
      signed: !!i.signedAt,
      piecesRecues: i.piecesRecues,
      satisfactionCompleted: !!i.satisfactionCompletedAt,
      satisfactionSent: !!i.satisfactionSentAt,
    })),
  };

  return computeValidation(snapshot);
}

/** Message unique de refus d'archivage (spec). */
export const ARCHIVE_BLOCKED_MESSAGE =
  "Cette session ne peut pas être archivée : des documents obligatoires sont manquants ou non validés.";

/**
 * Vérifie, VIA LE SERVICE UNIQUEMENT, qu'une session est archivable.
 * Retourne l'état de validation si OK, sinon une erreur normalisée.
 */
export async function assertArchivable(
  sessionId: string,
): Promise<
  | { ok: true; state: ValidationState }
  | { ok: false; error: string }
> {
  const state = await getSessionValidation(sessionId);
  if (!state) return { ok: false, error: "Session introuvable." };
  if (state.isArchived) return { ok: false, error: "Session déjà archivée." };
  if (!state.isValidated) return { ok: false, error: ARCHIVE_BLOCKED_MESSAGE };
  return { ok: true, state };
}
