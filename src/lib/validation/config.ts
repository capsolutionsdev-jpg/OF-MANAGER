/**
 * Configuration des règles de validation d'une session (Qualiopi).
 *
 * ⚠️ Aucune logique métier ici : uniquement des RÈGLES déclaratives. Le moteur
 * (`engine.ts`) applique ces règles sans connaître leur contenu. Pour rendre un
 * nouveau document obligatoire, il suffit d'AJOUTER une entrée dans un tableau
 * ci-dessous — aucune modification du moteur ni de l'archivage n'est requise.
 *
 * Chaque règle expose :
 *  - `applies`        : la règle s'applique-t-elle à ce contexte ? (ex. contrat
 *                       formateur seulement s'il y a un formateur, doc « si
 *                       applicable », etc.)
 *  - `auto`           : signal de validation AUTOMATIQUE (signature électronique
 *                       / complétion). `true` ⇒ Validé (automatique).
 *  - `artifactExists` : le document existe-t-il ? Distingue En attente (présent,
 *                       à valider) de Manquant (absent). Par défaut : true.
 *  - `href`           : lien d'accès direct au document (ou à l'écran pour le
 *                       produire) — pour « chaque doc manquant est accessible ».
 *  - `canManual`      : une validation manuelle (collaborateur) est-elle offerte ?
 */

import { ManualMark } from "./types";

/** Instantané d'une session (données brutes, sans logique). */
export interface SessionSnapshot {
  sessionId: string;
  isArchived: boolean;
  hasFormateur: boolean;
  contratFormateurToken: string | null;
  contratFormateurSentAt: Date | null;
  contratFormateurSignedAt: Date | null;
  crFormateurToken: string | null;
  crFormateurSentAt: Date | null;
  crFormateurCompletedAt: Date | null;
  emargement: { role: string; signed: boolean }[];
  piecesAttendues: string[];
  candidates: CandidateSnapshot[];
  /** Marques manuelles session/formateur : itemKey → marque. */
  manualMarks: Record<string, ManualMark>;
}

export interface CandidateSnapshot {
  inscriptionId: string;
  candidatId: string;
  name: string;
  signed: boolean; // signedAt renseigné (électronique OU sur place)
  piecesRecues: string[];
  satisfactionCompleted: boolean;
  satisfactionSent: boolean;
}

/** Règle de niveau session ou formateur. */
export interface SessionRule {
  key: string;
  label: string;
  applies: (s: SessionSnapshot) => boolean;
  auto?: (s: SessionSnapshot) => boolean;
  artifactExists?: (s: SessionSnapshot) => boolean;
  href?: (s: SessionSnapshot) => string | undefined;
  canManual: boolean;
}

/** Règle de niveau candidat (appliquée à chaque inscrit). */
export interface CandidateRule {
  key: string;
  label: string;
  applies: (c: CandidateSnapshot, s: SessionSnapshot) => boolean;
  auto?: (c: CandidateSnapshot, s: SessionSnapshot) => boolean;
  // Signal de validation manuelle porté par la donnée réelle (ex. pièce reçue) —
  // distinct d'une marque stockée.
  manual?: (c: CandidateSnapshot, s: SessionSnapshot) => boolean;
  artifactExists?: (c: CandidateSnapshot, s: SessionSnapshot) => boolean;
  href?: (c: CandidateSnapshot, s: SessionSnapshot) => string | undefined;
  canManual: boolean;
}

const activeCandidates = (s: SessionSnapshot) => s.candidates;

// ── Documents de la SESSION ──────────────────────────────────────────────
export const SESSION_RULES: SessionRule[] = [
  {
    key: "SESSION_EMARGEMENT",
    label: "Feuille d'émargement",
    applies: () => true,
    auto: (s) => s.emargement.some((e) => e.signed),
    artifactExists: (s) => s.emargement.length > 0,
    href: (s) => `/sessions/${s.sessionId}/emargement/feuille`,
    canManual: true,
  },
  {
    key: "SESSION_PROGRAMME",
    label: "Programme de la formation",
    applies: () => true,
    // Toujours présent (généré) : validation par confirmation du collaborateur.
    artifactExists: () => true,
    href: (s) => `/sessions/${s.sessionId}`,
    canManual: true,
  },
  {
    key: "SESSION_CONVENTION",
    label: "Convention / contrat de formation",
    applies: () => true,
    artifactExists: () => true,
    href: (s) => `/sessions/${s.sessionId}`,
    canManual: true,
  },
  {
    key: "SESSION_SATISFACTION",
    label: "Enquête de satisfaction",
    applies: () => true,
    auto: (s) =>
      activeCandidates(s).length > 0 &&
      activeCandidates(s).every((c) => c.satisfactionCompleted),
    artifactExists: (s) =>
      activeCandidates(s).some((c) => c.satisfactionCompleted || c.satisfactionSent),
    href: (s) => `/sessions/${s.sessionId}`,
    canManual: true,
  },
];

// ── Documents du FORMATEUR (uniquement si un formateur est affecté) ────────
export const TRAINER_RULES: SessionRule[] = [
  {
    key: "TRAINER_CONTRAT",
    label: "Contrat de sous-traitance formateur",
    applies: (s) => s.hasFormateur,
    auto: (s) => !!s.contratFormateurSignedAt,
    artifactExists: (s) => !!s.contratFormateurSentAt || !!s.contratFormateurSignedAt,
    href: (s) => `/documents/contrat-formateur/${s.sessionId}`,
    canManual: true,
  },
  {
    key: "TRAINER_COMPTE_RENDU",
    label: "Compte-rendu pédagogique / bilan",
    applies: (s) => s.hasFormateur,
    auto: (s) => !!s.crFormateurCompletedAt,
    artifactExists: (s) => !!s.crFormateurSentAt || !!s.crFormateurCompletedAt,
    href: (s) =>
      s.crFormateurToken ? `/compte-rendu/${s.crFormateurToken}/document` : undefined,
    canManual: true,
  },
  {
    key: "TRAINER_EMARGEMENT",
    label: "Feuille d'émargement signée (formateur)",
    applies: (s) => s.hasFormateur,
    auto: (s) => s.emargement.some((e) => e.role === "FORMATEUR" && e.signed),
    artifactExists: (s) => s.emargement.some((e) => e.role === "FORMATEUR"),
    href: (s) => `/sessions/${s.sessionId}/emargement/feuille`,
    canManual: true,
  },
];

// ── Documents de chaque CANDIDAT ───────────────────────────────────────────
/** Règles candidat de base + une règle par pièce attendue de la formation. */
export function candidateRules(piecesAttendues: string[]): CandidateRule[] {
  const rules: CandidateRule[] = [
    {
      key: "CAND_SIGNATURES",
      label: "Documents contractuels signés",
      applies: () => true,
      auto: (c) => c.signed, // signature électronique OU signé sur place
      artifactExists: () => true,
      href: (c) => `/documents/${c.inscriptionId}/pdf`,
      canManual: true, // « signé sur place » ⇒ renseigne signedAt
    },
  ];
  for (const piece of piecesAttendues) {
    rules.push({
      key: `CAND_PIECE::${piece}`,
      label: `Pièce : ${piece}`,
      applies: () => true,
      // Une pièce reçue (piecesRecues) = validée manuellement par le centre ;
      // absente ⇒ Manquant.
      manual: (c) => c.piecesRecues.includes(piece),
      artifactExists: (c) => c.piecesRecues.includes(piece),
      href: (c) => `/candidats/${c.candidatId}`,
      canManual: true, // marquer la pièce reçue
    });
  }
  return rules;
}
