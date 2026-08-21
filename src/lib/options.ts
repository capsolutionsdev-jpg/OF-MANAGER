// Catalogue des OPTIONS à la carte, PACKS MÉTIER et FRAIS DE MISE EN SERVICE
// vendus en complément d'un palier (plan de lancement, feuilles 3 & 4).
//
// Repères tarifaires en code (comme lib/plans.ts) — HT. Règle d'or (feuille 3) :
// aucune combinaison d'options ne doit reconstituer un palier supérieur moins
// cher (garanti par `ouvertDes` + un test d'anti-cannibalisation).

import { PLAN_ORDER, type FormuleKey } from "@/lib/plans";

const tierRank = (k: FormuleKey): number => PLAN_ORDER.indexOf(k);

// ── Options mensuelles à la carte ────────────────────────────────────────────
export type OptionMensuelle = {
  key: string;
  label: string;
  prixMois: number; // € HT / mois
  ouvertDes: FormuleKey; // palier MINIMUM pour souscrire l'option
  inclusDes: FormuleKey | null; // palier à partir duquel elle est INCLUSE (gratuite) ; null = jamais incluse
  features: string[]; // clés de fonctionnalités débloquées (cf. lib/features)
  note?: string;
};

export const OPTIONS: OptionMensuelle[] = [
  { key: "site-vitrine", label: "Site vitrine piloté + blog", prixMois: 79, ouvertDes: "PRO", inclusDes: "CROISSANCE", features: ["site-vitrine", "blog"], note: "Aucun équivalent concurrent" },
  { key: "leads", label: "Capture de leads multicanal", prixMois: 69, ouvertDes: "PRO", inclusDes: "CROISSANCE", features: ["leads-multicanal"], note: "Aucun équivalent concurrent" },
  { key: "ia", label: "Assistant IA", prixMois: 49, ouvertDes: "PRO", inclusDes: "CROISSANCE", features: ["ia"], note: "Dendreo : 39 à 99 €" },
  { key: "elearning", label: "E-learning", prixMois: 49, ouvertDes: "INDEPENDANT", inclusDes: "PRO", features: ["elearning"], note: "Digiforma LMS+ : 59 €" },
  { key: "marque-blanche", label: "Marque blanche complète", prixMois: 99, ouvertDes: "CROISSANCE", inclusDes: "RESEAU", features: [], note: "Le poste que les réseaux paient le plus cher" },
  { key: "centre-suppl", label: "Centre supplémentaire", prixMois: 99, ouvertDes: "CROISSANCE", inclusDes: null, features: [], note: "Digiforma et Dendreo : 99 €" },
];

const OPTION_BY_KEY = new Map(OPTIONS.map((o) => [o.key, o]));
export const optionByKey = (key: string): OptionMensuelle | undefined => OPTION_BY_KEY.get(key);

export type OptionStatut = "incluse" | "souscriptible" | "indisponible";

/** Disponibilité d'une option pour un palier donné — PUR. */
export function optionStatut(o: OptionMensuelle, palier: FormuleKey): OptionStatut {
  if (o.inclusDes && tierRank(palier) >= tierRank(o.inclusDes)) return "incluse";
  if (tierRank(palier) >= tierRank(o.ouvertDes)) return "souscriptible";
  return "indisponible";
}

/** Total mensuel des options RÉELLEMENT facturées (souscriptibles) pour un palier — PUR. */
export function totalOptionsMois(keys: string[], palier: FormuleKey): number {
  return keys.reduce((sum, k) => {
    const o = OPTION_BY_KEY.get(k);
    if (o && optionStatut(o, palier) === "souscriptible") return sum + o.prixMois;
    return sum;
  }, 0);
}

// ── Packs métier (activation one-time + récurrent mensuel) ────────────────────
export type PackMetier = {
  key: string;
  label: string;
  activation: number; // € HT une fois
  prixMois: number; // € HT / mois
  ouvertDes: FormuleKey;
  features: string[]; // clés débloquées
  note?: string;
};

export const PACKS_METIER: PackMetier[] = [
  { key: "pack-securite", label: "Pack Sécurité — jury, diplômes, cartes professionnelles", activation: 250, prixMois: 39, ouvertDes: "PRO", features: ["jurys", "diplomes"], note: "Offert aux Pionniers" },
  { key: "pack-transport", label: "Pack Transport — parcours examen Taxi/VTC (T3P), FIMO/FCO", activation: 250, prixMois: 39, ouvertDes: "PRO", features: ["parcours-t3p"], note: "Offert aux Pionniers" },
  { key: "pack-second", label: "Second pack métier", activation: 125, prixMois: 20, ouvertDes: "PRO", features: [], note: "Centres mixtes sécurité + transport" },
];

const PACK_BY_KEY = new Map(PACKS_METIER.map((p) => [p.key, p]));
export const packByKey = (key: string): PackMetier | undefined => PACK_BY_KEY.get(key);

/** Un pack est-il disponible pour ce palier ? — PUR. */
export function packDisponible(p: PackMetier, palier: FormuleKey): boolean {
  return tierRank(palier) >= tierRank(p.ouvertDes);
}

export function totalPacksMois(keys: string[]): number {
  return keys.reduce((s, k) => s + (PACK_BY_KEY.get(k)?.prixMois ?? 0), 0);
}
export function totalPacksActivation(keys: string[]): number {
  return keys.reduce((s, k) => s + (PACK_BY_KEY.get(k)?.activation ?? 0), 0);
}

// ── Frais de mise en service (one-time, par palier — feuille 4) ───────────────
export const FRAIS_MISE_EN_SERVICE: Record<FormuleKey, number> = {
  INDEPENDANT: 190,
  PRO: 490,
  CROISSANCE: 890,
  RESEAU: 1500,
};

/** Frais de mise en service d'un palier — PUR. */
export function fraisMiseEnService(palier: FormuleKey): number {
  return FRAIS_MISE_EN_SERVICE[palier];
}
