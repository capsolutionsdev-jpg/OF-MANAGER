/**
 * Moteur de validation — FONCTIONS PURES, sans I/O ni dépendance UI.
 * Prend un instantané de session (SessionSnapshot) + la config de règles, et
 * renvoie l'état de validation sérialisable. Utilisé par le service serveur
 * (données réelles) et testable isolément.
 */

import {
  SessionSnapshot,
  CandidateSnapshot,
  SessionRule,
  CandidateRule,
  SESSION_RULES,
  TRAINER_RULES,
  candidateRules,
} from "./config";
import {
  ValidationState,
  ValidationItem,
  SectionState,
  CandidateState,
  ItemStatus,
  SectionKey,
  isValidated,
} from "./types";

/** Résout le statut d'une règle session/formateur (marques stockées). */
function resolveSessionItem(rule: SessionRule, s: SessionSnapshot): ValidationItem {
  const base = { key: rule.key, label: rule.label, canManual: rule.canManual, href: rule.href?.(s) };
  if (rule.auto?.(s)) return { ...base, status: "VALIDATED_AUTO" };
  const mark = s.manualMarks[rule.key];
  if (mark) {
    return {
      ...base,
      status: "VALIDATED_MANUAL",
      by: mark.nom,
      at: mark.date,
      comment: mark.comment,
    };
  }
  const exists = rule.artifactExists ? rule.artifactExists(s) : true;
  return { ...base, status: exists ? "PENDING" : "MISSING" };
}

/** Résout le statut d'une règle candidat (signaux portés par la donnée réelle). */
function resolveCandidateItem(
  rule: CandidateRule,
  c: CandidateSnapshot,
  s: SessionSnapshot,
): ValidationItem {
  const base: ValidationItem = {
    key: rule.key,
    label: rule.label,
    status: "PENDING",
    canManual: rule.canManual,
    href: rule.href?.(c, s),
    inscriptionId: c.inscriptionId,
    ...(rule.key.startsWith("CAND_PIECE::")
      ? { pieceLabel: rule.key.slice("CAND_PIECE::".length) }
      : {}),
  };
  if (rule.auto?.(c, s)) return { ...base, status: "VALIDATED_AUTO" };
  if (rule.manual?.(c, s)) return { ...base, status: "VALIDATED_MANUAL" };
  const exists = rule.artifactExists ? rule.artifactExists(c, s) : true;
  return { ...base, status: exists ? "PENDING" : "MISSING" };
}

function countValidated(items: ValidationItem[]): number {
  return items.filter((i) => isValidated(i.status)).length;
}

function buildSection(
  key: SectionKey,
  label: string,
  rules: SessionRule[],
  s: SessionSnapshot,
): SectionState {
  const items = rules.filter((r) => r.applies(s)).map((r) => resolveSessionItem(r, s));
  return { key, label, items, validated: countValidated(items), total: items.length };
}

/** Calcule l'état de validation complet d'une session (pur). */
export function computeValidation(s: SessionSnapshot): ValidationState {
  const session = buildSection("SESSION", "Documents de la session", SESSION_RULES, s);
  const trainer = buildSection("TRAINER", "Documents du formateur", TRAINER_RULES, s);

  const cRules = candidateRules(s.piecesAttendues);
  const candidates: CandidateState[] = s.candidates.map((c) => {
    const items = cRules
      .filter((r) => r.applies(c, s))
      .map((r) => resolveCandidateItem(r, c, s));
    const validated = countValidated(items);
    return {
      inscriptionId: c.inscriptionId,
      candidatId: c.candidatId,
      name: c.name,
      items,
      validated,
      total: items.length,
      compliant: items.every((i) => isValidated(i.status)),
    };
  });

  const totalItems =
    session.total +
    trainer.total +
    candidates.reduce((n, c) => n + c.total, 0);
  const validatedItems =
    session.validated +
    trainer.validated +
    candidates.reduce((n, c) => n + c.validated, 0);
  const percentage = totalItems === 0 ? 100 : Math.round((validatedItems / totalItems) * 100);

  const sessionOk = session.items.every((i) => isValidated(i.status));
  const trainerOk = trainer.items.every((i) => isValidated(i.status));
  const candidatesOk = candidates.every((c) => c.compliant);

  return {
    sessionId: s.sessionId,
    session,
    trainer,
    candidates,
    candidatesCompliant: candidates.filter((c) => c.compliant).length,
    candidatesTotal: candidates.length,
    totalItems,
    validatedItems,
    percentage,
    isValidated: sessionOk && trainerOk && candidatesOk,
    isArchived: s.isArchived,
  };
}

/** Réexport pratique. */
export type { ItemStatus };
