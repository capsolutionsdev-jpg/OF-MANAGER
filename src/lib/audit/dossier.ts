/**
 * Checklist de conformité d'un DOSSIER (= une inscription) pour le module Audit,
 * alignée sur le Référentiel National Qualité (RNQ « Qualiopi » v9, 7 critères /
 * 32 indicateurs). Statut calculé EN DIRECT quand l'info est traçable ; sinon
 * l'élément est « à valider » (visa manuel du collaborateur). Module pur.
 *
 * Chaque élément indique :
 *  - `indicateur` : n° d'indicateur RNQ concerné ;
 *  - `relance` : action d'e-mail ciblée si le document dépend du candidat
 *    ("parcours" = renvoi du lien compléter+signer ; sinon un événement ciblé) ;
 *  - `manuel` : élément non détectable automatiquement → visa collaborateur.
 */

export type DossierCheckStatut = "PRESENT" | "A_SIGNER" | "MANQUANT" | "A_VALIDER" | "NA";

export type RelanceKind = "parcours" | "convocation" | "positionnement" | "satisfaction" | "docs_fin" | null;

export type DossierCheck = {
  key: string;
  label: string;
  indicateur: number | null;
  statut: DossierCheckStatut;
  relance: RelanceKind;
  manuel: boolean;
};

export type DossierAuditInput = {
  signedAt: Date | null;
  piecesRecues: string[];
  positionnementCompletedAt: Date | null;
  convocationSentAt: Date | null;
  satisfactionCompletedAt: Date | null;
  docsFinSentAt: Date | null;
  attestationReussiteSentAt: Date | null;
  suivi6moisCompletedAt: Date | null;
  resultatCertification: string; // CertificationResultat
  formation: {
    piecesAttendues: string[];
    examen: boolean | null;
    diplomante: boolean | null;
    positionnementQuestions: unknown;
  };
};

const has = (v: unknown) => v !== null && v !== undefined;

/**
 * Construit la checklist Qualiopi d'un dossier.
 * `validated` = ensemble des clés visées manuellement (remplace le statut par PRESENT).
 */
export function dossierChecklist(i: DossierAuditInput, validated: Set<string> = new Set()): DossierCheck[] {
  const f = i.formation;
  const raw: DossierCheck[] = [];

  // — Critère 1/2 : information & analyse du besoin —
  raw.push({ key: "signatures", label: "Documents contractuels signés (fiche, contrat/convention, CGV, RI)", indicateur: 4, statut: i.signedAt ? "PRESENT" : "A_SIGNER", relance: "parcours", manuel: false });

  for (const piece of f.piecesAttendues ?? []) {
    raw.push({ key: `piece::${piece}`, label: `Pièce du dossier : ${piece}`, indicateur: 4, statut: i.piecesRecues?.includes(piece) ? "PRESENT" : "MANQUANT", relance: "parcours", manuel: false });
  }

  // — Critère 2 : conception (programme, objectifs) —
  raw.push({ key: "programme", label: "Programme de formation remis au stagiaire", indicateur: 6, statut: "A_VALIDER", relance: null, manuel: true });

  // — Critère 3 : accueil / conditions de déroulement —
  const pq = f.positionnementQuestions;
  const hasPositionnement = Array.isArray(pq) ? pq.length > 0 : has(pq);
  raw.push({ key: "positionnement", label: "Positionnement / évaluation du besoin à l'entrée", indicateur: 8, statut: !hasPositionnement ? "NA" : i.positionnementCompletedAt ? "PRESENT" : "MANQUANT", relance: "positionnement", manuel: false });
  raw.push({ key: "convocation", label: "Convocation envoyée", indicateur: 9, statut: i.convocationSentAt ? "PRESENT" : "MANQUANT", relance: "convocation", manuel: false });
  raw.push({ key: "reglement_interieur", label: "Règlement intérieur remis", indicateur: 9, statut: "A_VALIDER", relance: null, manuel: true });
  raw.push({ key: "livret_accueil", label: "Livret d'accueil / info accessibilité handicap", indicateur: 26, statut: "A_VALIDER", relance: null, manuel: true });

  // — Critère 3 : engagement / assiduité (émargement) —
  raw.push({ key: "emargement", label: "Feuille d'émargement / présence signée", indicateur: 12, statut: "A_VALIDER", relance: null, manuel: true });

  // — Critère 4 : atteinte des objectifs (évaluation, résultats, attestation) —
  if (f.examen) {
    raw.push({ key: "resultat", label: "Résultat / évaluation des acquis saisi", indicateur: 11, statut: i.resultatCertification && i.resultatCertification !== "NON_EVALUE" ? "PRESENT" : "MANQUANT", relance: null, manuel: false });
  } else {
    raw.push({ key: "evaluation_acquis", label: "Évaluation des acquis (fin de formation)", indicateur: 11, statut: "A_VALIDER", relance: null, manuel: true });
  }
  raw.push({ key: "docs_fin", label: "Attestation de fin / certificat de réalisation", indicateur: 11, statut: i.docsFinSentAt || i.attestationReussiteSentAt ? "PRESENT" : "MANQUANT", relance: "docs_fin", manuel: false });

  // — Critère 6 : appréciations (satisfaction) —
  raw.push({ key: "satisfaction", label: "Enquête de satisfaction (à chaud)", indicateur: 30, statut: i.satisfactionCompletedAt ? "PRESENT" : "MANQUANT", relance: "satisfaction", manuel: false });

  // — Suivi du devenir — affiché pour les formations diplômantes ET dès qu'une
  // enquête a été complétée (une réponse ne doit jamais rester invisible).
  if (f.diplomante || i.suivi6moisCompletedAt) {
    raw.push({ key: "suivi_6mois", label: "Enquête de suivi à 6 mois (devenir)", indicateur: 11, statut: i.suivi6moisCompletedAt ? "PRESENT" : "MANQUANT", relance: null, manuel: true });
  }

  // Applique les visas manuels : une clé validée passe à PRESENT.
  return raw.map((c) => (validated.has(c.key) && c.statut !== "PRESENT" ? { ...c, statut: "PRESENT" as const } : c));
}

/** Synthèse d'un dossier : conforme si aucun élément ni « à traiter » ni « à valider ». */
export function dossierConformite(checks: DossierCheck[]): {
  total: number;
  ok: number;
  aTraiter: number;
  conforme: boolean;
  pct: number;
} {
  const applicables = checks.filter((c) => c.statut !== "NA");
  const ok = applicables.filter((c) => c.statut === "PRESENT").length;
  const aTraiter = applicables.length - ok;
  const total = applicables.length;
  return {
    total,
    ok,
    aTraiter,
    conforme: aTraiter === 0,
    pct: total === 0 ? 100 : Math.round((ok / total) * 100),
  };
}

export const DOSSIER_CHECK_LABEL: Record<DossierCheckStatut, string> = {
  PRESENT: "Présent",
  A_SIGNER: "À signer",
  MANQUANT: "Manquant",
  A_VALIDER: "À valider",
  NA: "N/A",
};
