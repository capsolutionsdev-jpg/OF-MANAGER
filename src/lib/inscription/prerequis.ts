// Import direct du sous-module PUR (catalog) — pas le barrel `titres` qui
// ré-exporte `numero`/`render` (côté serveur) et ferait fuiter du code serveur
// dans les bundles client qui utilisent ce module.
import { attestationCodeForFormation, ssiapDiplomeNiveau } from "@/lib/documents/titres/catalog";

/**
 * Prérequis & spécificités PAR FORMATION pour l'inscription sur place.
 * Détermine, à partir de la formation, les champs conditionnels à capturer et
 * vérifier (le collaborateur renseigne l'état de chaque prérequis — pas de
 * blocage). Extensible : ajouter un cas = une règle ici.
 */

export type FormationLike = { reference?: string | null; titre?: string | null };

export type PrereqSpec = {
  /** Recyclage / RAN SSIAP → diplôme SSIAP détenu (n° + date). */
  ssiap?: { niveau: 1 | 2 | 3 };
  /** Sécurité privée (TFP APS, MAC APS) → autorisation préalable CNAPS. */
  cnaps?: boolean;
  /** MAC APS → carte professionnelle valide EN ALTERNATIVE à l'autorisation CNAPS. */
  carteProAlternative?: boolean;
  /** MAC SST → être titulaire du certificat SST. */
  sstCert?: boolean;
  /** Aptitude médicale — certificat médical requis (SSIAP 1/2 initial, VTC, Taxi). */
  medicalCert?: boolean;
  /** Conditions déclaratives à confirmer (permis, casier, PSC1…). */
  checks?: string[];
};

export function formationPrereq(f: FormationLike): PrereqSpec {
  const S = `${f.reference ?? ""} ${f.titre ?? ""}`.toUpperCase();
  const spec: PrereqSpec = {};

  // SSIAP recyclage / remise à niveau → diplôme détenu.
  const att = attestationCodeForFormation(f);
  if (att && (att.endsWith("_RECYCLAGE") || att.endsWith("_RAN"))) {
    const n = Number(att.match(/SSIAP([123])/)?.[1] ?? "1") as 1 | 2 | 3;
    spec.ssiap = { niveau: n };
  }
  // SSIAP 1 & 2 INITIAL → visite médicale + certificat médical (arrêté 02/05/2005).
  const ssiapInit = ssiapDiplomeNiveau(f);
  if (ssiapInit === 1 || ssiapInit === 2) spec.medicalCert = true;

  // Sécurité privée (CNAPS) : APS, A3P (protection physique), opérateur de
  // vidéoprotection → autorisation préalable CNAPS. MAC APS, A3P et
  // vidéoprotection acceptent une carte professionnelle valide EN ALTERNATIVE.
  const hasSst = /SST|SAUVETEUR/.test(S);
  const isMacAps = /MAC/.test(S) && /APS/.test(S);
  const isAps = /APS/.test(S) && !hasSst;
  const isA3P = /A3P|PROTECTION\s+PHYSIQUE/.test(S);
  const isVideoprot = /VID[EÉ]OPROTECTION/.test(S);
  if (isAps || isA3P || isVideoprot) spec.cnaps = true;
  if (isMacAps || isA3P || isVideoprot) spec.carteProAlternative = true;

  // MAC SST → certificat SST détenu.
  if (/MAC/.test(S) && hasSst) spec.sstCert = true;

  // Transport T3P — VTC / Taxi (formation initiale, préparation à l'examen).
  const isVtc = /\bVTC\b/.test(S);
  const isTaxi = /\bTAXI\b/.test(S);
  if (isVtc !== isTaxi) {
    // Une seule des deux (on ignore les passerelles VTC↔Taxi qui contiennent les deux).
    const checks = ["Permis B en cours de validité depuis plus de 3 ans (2 ans en conduite accompagnée)"];
    if (isTaxi) checks.push("PSC1 en cours de validité");
    checks.push("Casier judiciaire compatible avec l'exercice de la profession");
    spec.checks = checks;
    spec.medicalCert = true; // aptitude médicale à la conduite
  }

  return spec;
}

/** Vrai si la formation porte au moins une spécificité à capturer. */
export function hasPrereq(spec: PrereqSpec): boolean {
  return !!(
    spec.ssiap ||
    spec.cnaps ||
    spec.carteProAlternative ||
    spec.sstCert ||
    spec.medicalCert ||
    (spec.checks && spec.checks.length > 0)
  );
}
