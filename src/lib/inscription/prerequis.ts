import { attestationCodeForFormation } from "@/lib/documents/titres";

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

  // Sécurité privée (CNAPS). MAC APS : carte pro OU autorisation.
  const hasSst = /SST|SAUVETEUR/.test(S);
  const isMacAps = /MAC/.test(S) && /APS/.test(S);
  const isAps = /APS/.test(S) && !hasSst; // APS (initial ou MAC), pas SST
  if (isAps) spec.cnaps = true;
  if (isMacAps) spec.carteProAlternative = true;

  // MAC SST → certificat SST détenu.
  if (/MAC/.test(S) && hasSst) spec.sstCert = true;

  return spec;
}

/** Vrai si la formation porte au moins une spécificité à capturer. */
export function hasPrereq(spec: PrereqSpec): boolean {
  return !!(spec.ssiap || spec.cnaps || spec.carteProAlternative || spec.sstCert);
}
