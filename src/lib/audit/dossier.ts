/**
 * Checklist de conformité d'un DOSSIER (= une inscription) pour le module Audit.
 * Calculée EN DIRECT à partir de l'état réel de l'inscription (signatures,
 * pièces, positionnement, convocation, satisfaction, résultat) et de la
 * formation. Module pur (aucune écriture) — utilisable côté serveur.
 *
 * Le niveau SESSION (émargements, formateur, programme…) reste géré par
 * lib/qualiopi/audit.ts (auditSession) ; ici on couvre le niveau candidat.
 */

export type DossierCheckStatut = "PRESENT" | "A_SIGNER" | "MANQUANT" | "NA";

export type DossierCheck = {
  key: string;
  label: string;
  indicateur: number | null; // n° d'indicateur RNQ concerné
  statut: DossierCheckStatut;
};

export type DossierAuditInput = {
  signedAt: Date | null;
  piecesRecues: string[];
  positionnementCompletedAt: Date | null;
  convocationSentAt: Date | null;
  satisfactionCompletedAt: Date | null;
  resultatCertification: string; // CertificationResultat
  attestationReussiteSentAt: Date | null;
  formation: {
    piecesAttendues: string[];
    examen: boolean | null;
    positionnementQuestions: unknown;
  };
};

const has = (v: unknown) => v !== null && v !== undefined;

/** Construit la checklist documentaire d'un dossier. */
export function dossierChecklist(i: DossierAuditInput): DossierCheck[] {
  const checks: DossierCheck[] = [];
  const f = i.formation;

  // 1) Documents contractuels signés (fiche, contrat/convention, CGV, RI…).
  checks.push({
    key: "signatures",
    label: "Documents contractuels signés",
    indicateur: 4,
    statut: i.signedAt ? "PRESENT" : "A_SIGNER",
  });

  // 2) Pièces du dossier administratif attendues.
  for (const piece of f.piecesAttendues ?? []) {
    checks.push({
      key: `piece::${piece}`,
      label: `Pièce : ${piece}`,
      indicateur: 4,
      statut: i.piecesRecues?.includes(piece) ? "PRESENT" : "MANQUANT",
    });
  }

  // 3) Positionnement à l'entrée (si la formation en prévoit).
  const pq = f.positionnementQuestions;
  const hasPositionnement = Array.isArray(pq) ? pq.length > 0 : has(pq);
  checks.push({
    key: "positionnement",
    label: "Test de positionnement",
    indicateur: 8,
    statut: !hasPositionnement ? "NA" : i.positionnementCompletedAt ? "PRESENT" : "MANQUANT",
  });

  // 4) Convocation envoyée.
  checks.push({
    key: "convocation",
    label: "Convocation envoyée",
    indicateur: 5,
    statut: i.convocationSentAt ? "PRESENT" : "MANQUANT",
  });

  // 5) Enquête de satisfaction.
  checks.push({
    key: "satisfaction",
    label: "Enquête de satisfaction",
    indicateur: 30,
    statut: i.satisfactionCompletedAt ? "PRESENT" : "MANQUANT",
  });

  // 6) Résultat / certification (formations sanctionnées par un examen).
  if (f.examen) {
    checks.push({
      key: "resultat",
      label: "Résultat d'évaluation saisi",
      indicateur: 11,
      statut: i.resultatCertification && i.resultatCertification !== "NON_EVALUE" ? "PRESENT" : "MANQUANT",
    });
    checks.push({
      key: "attestation",
      label: "Attestation de réussite délivrée",
      indicateur: 11,
      statut: i.attestationReussiteSentAt ? "PRESENT" : "NA",
    });
  }

  return checks;
}

/** Synthèse d'un dossier : conforme si aucun manque ni signature en attente. */
export function dossierConformite(checks: DossierCheck[]): {
  total: number;
  ok: number;
  aTraiter: number;
  conforme: boolean;
  pct: number;
} {
  const applicables = checks.filter((c) => c.statut !== "NA");
  const ok = applicables.filter((c) => c.statut === "PRESENT").length;
  const aTraiter = applicables.filter((c) => c.statut === "MANQUANT" || c.statut === "A_SIGNER").length;
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
  NA: "N/A",
};
