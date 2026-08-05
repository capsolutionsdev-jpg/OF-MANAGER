/**
 * Agréments et autorisations de l'organisme, par FAMILLE de formations.
 *
 * Un agrément couvre plusieurs formations : l'autorisation CNAPS vaut pour APS,
 * A3P et opérateur de vidéoprotection ; l'agrément SSIAP couvre les niveaux
 * 1/2/3 ; VTC et Taxi ont chacun le leur ; les habilitations électriques
 * (H0B0, BS/BE) n'en requièrent pas.
 *
 * Stockage : `Organisme.documentsConfig.agrements` (+ `documentsConfig.ssiap`
 * conservé pour la numérotation des diplômes SSIAP : département + n°).
 */

export type AgrementFamille = "cnaps" | "ssiap" | "sst" | "vtc" | "taxi";

export type AgrementsConfig = {
  cnaps?: string; // APS · A3P · opérateur de vidéoprotection
  ssiap?: string; // agrément préfectoral SSIAP (= n° utilisé dans le numéro de diplôme)
  ssiapDepartement?: string; // code département de l'agrément SSIAP (ex. « 093 »)
  sst?: string; // habilitation INRS / entité SST
  vtc?: string; // agrément préfectoral VTC
  taxi?: string; // agrément préfectoral Taxi
};

export const AGREMENT_FAMILLES: {
  key: AgrementFamille;
  label: string;
  couvre: string;
  placeholder: string;
}[] = [
  {
    key: "cnaps",
    label: "Autorisation CNAPS — sécurité privée",
    couvre: "TFP APS, MAC APS, A3P, opérateur de vidéoprotection",
    placeholder: "AUT-093-2026-…",
  },
  {
    key: "ssiap",
    label: "Agrément préfectoral SSIAP",
    couvre: "SSIAP 1, 2 et 3 (initial, recyclage, remise à niveau)",
    placeholder: "0042",
  },
  {
    key: "sst",
    label: "Habilitation SST (INRS)",
    couvre: "SST et MAC SST",
    placeholder: "H39494/2026/SST-1/O/12",
  },
  { key: "vtc", label: "Agrément VTC", couvre: "Formation VTC et formation continue VTC", placeholder: "93/22-09" },
  { key: "taxi", label: "Agrément Taxi", couvre: "Formation Taxi et formation continue Taxi", placeholder: "93/…" },
];

/** Lit la configuration des agréments depuis `documentsConfig`. */
export function readAgrements(documentsConfig: unknown): AgrementsConfig {
  const cfg = documentsConfig as
    | { agrements?: AgrementsConfig; ssiap?: { departement?: string; agrement?: string } }
    | null
    | undefined;
  const a = cfg?.agrements ?? {};
  return {
    ...a,
    // Repli sur l'ancien emplacement `documentsConfig.ssiap` (numérotation).
    ssiap: a.ssiap ?? cfg?.ssiap?.agrement,
    ssiapDepartement: a.ssiapDepartement ?? cfg?.ssiap?.departement,
  };
}

/**
 * Fusionne les agréments dans `documentsConfig` sans écraser les autres clés,
 * et maintient `documentsConfig.ssiap` (source de la numérotation des diplômes).
 */
export function mergeAgrements(
  documentsConfig: unknown,
  next: AgrementsConfig,
): Record<string, unknown> {
  const base = (documentsConfig as Record<string, unknown> | null) ?? {};
  const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : undefined);
  const agrements: AgrementsConfig = {
    cnaps: clean(next.cnaps),
    ssiap: clean(next.ssiap),
    ssiapDepartement: clean(next.ssiapDepartement),
    sst: clean(next.sst),
    vtc: clean(next.vtc),
    taxi: clean(next.taxi),
  };
  return {
    ...base,
    agrements,
    ssiap: { departement: agrements.ssiapDepartement, agrement: agrements.ssiap },
  };
}

/** Agrément applicable à un type de titre (code du catalogue `titres`). */
export function agrementPourTypeCode(code: string, ag: AgrementsConfig): string | undefined {
  if (code.startsWith("SSIAP")) return ag.ssiap;
  if (code === "FC_VTC") return ag.vtc;
  if (code === "FC_TAXI") return ag.taxi;
  return undefined; // habilitations électriques : pas d'agrément
}

/** Agrément applicable à une formation (pour l'afficher sur ses documents). */
export function agrementPourFormation(
  f: { reference?: string | null; titre?: string | null },
  ag: AgrementsConfig,
): string | undefined {
  const S = `${f.reference ?? ""} ${f.titre ?? ""}`.toUpperCase();
  if (/SSIAP/.test(S)) return ag.ssiap;
  if (/\bVTC\b/.test(S)) return ag.vtc;
  if (/\bTAXI\b/.test(S)) return ag.taxi;
  if (/SST|SAUVETEUR/.test(S)) return ag.sst;
  if (/APS|A3P|PROTECTION\s+PHYSIQUE|VID[EÉ]OPROTECTION/.test(S)) return ag.cnaps;
  return undefined; // H0B0 / BS-BE : pas d'agrément requis
}
