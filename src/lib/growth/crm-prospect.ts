// Prospection CRM sortante — logique PURE partagée par l'import Excel
// (scripts/import-prospects-crm.mjs), l'ajout manuel (console) et la fiche.
//
// Les deux fichiers Excel (sécurité / transport) suivent la même trame :
//   - Statut : À contacter / Contacté / En discussion / Rdv fixé / Client / Perdu / Sans intérêt
//   - Priorité : Haute / Moyenne / Basse
//   - Découpage : par RÉGION (sécurité) puis département ; par DÉPARTEMENT (transport)
// On mappe le vocabulaire Excel vers le pipeline 8 étapes déjà en place (cf.
// lib/growth/pipeline.ts) : une seule source de vérité pour le statut.

import { LEAD_PERDU, type StageKey } from "@/lib/growth/pipeline";

/** Statut Excel (texte libre) → étape du pipeline. Défaut : FICHIER. */
export function mapExcelStatut(label?: string | null): StageKey | typeof LEAD_PERDU {
  const s = (label ?? "").toLowerCase().trim();
  if (!s) return "FICHIER";
  if (/[àa]\s*contacter/.test(s)) return "FICHIER"; // état initial (avant « contacté »)
  if (/rdv|rendez|d[ée]mo|planifi/.test(s)) return "DEMO_PLANIFIEE";
  if (/discussion|[ée]chang|relanc|int[ée]ress/.test(s)) return "ENGAGE";
  if (/contact[ée](?!r)/.test(s)) return "CONTACTE"; // « contacté(s) » — pas « contacter »
  if (/client|sign[ée]|gagn/.test(s)) return "SIGNE";
  if (/perdu|sans int[ée]r[êe]t|refus|pas int|clos/.test(s)) return LEAD_PERDU;
  return "FICHIER"; // inconnus
}

export const PRIORITES = ["haute", "moyenne", "basse"] as const;
export type Priorite = (typeof PRIORITES)[number];

export const PRIORITE_LABELS: Record<Priorite, string> = {
  haute: "Haute",
  moyenne: "Moyenne",
  basse: "Basse",
};

/** Priorité Excel (Haute/Moyenne/Basse, casse libre) → clé normalisée (null si vide). */
export function normalizePriorite(v?: string | null): Priorite | null {
  const s = (v ?? "").toLowerCase().trim();
  if (!s) return null;
  if (s.startsWith("h")) return "haute";
  if (s.startsWith("m") || s.startsWith("moy")) return "moyenne";
  if (s.startsWith("b")) return "basse";
  return null;
}

// ── Découpage géographique ───────────────────────────────────────────────────

/** Région administrative → liste des départements (métropole + DOM). */
const REGION_DEPARTEMENTS: Record<string, string[]> = {
  "Auvergne-Rhône-Alpes": ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"],
  "Bourgogne-Franche-Comté": ["21", "25", "39", "58", "70", "71", "89", "90"],
  Bretagne: ["22", "29", "35", "56"],
  "Centre-Val de Loire": ["18", "28", "36", "37", "41", "45"],
  Corse: ["2A", "2B", "20"],
  "Grand Est": ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"],
  "Hauts-de-France": ["02", "59", "60", "62", "80"],
  "Île-de-France": ["75", "77", "78", "91", "92", "93", "94", "95"],
  Normandie: ["14", "27", "50", "61", "76"],
  "Nouvelle-Aquitaine": ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"],
  Occitanie: ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"],
  "Pays de la Loire": ["44", "49", "53", "72", "85"],
  "Provence-Alpes-Côte d'Azur": ["04", "05", "06", "13", "83", "84"],
  Guadeloupe: ["971"],
  Martinique: ["972"],
  Guyane: ["973"],
  "La Réunion": ["974"],
  Mayotte: ["976"],
};

const DEP_TO_REGION: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [region, deps] of Object.entries(REGION_DEPARTEMENTS)) {
    for (const d of deps) m[d] = region;
  }
  return m;
})();

/** Code département depuis un code postal FR (2 chiffres, 3 pour les DOM, 2A/2B Corse). */
export function departementFromCodePostal(cp?: string | null): string | null {
  const digits = (cp ?? "").replace(/\s/g, "");
  if (!/^\d{4,5}$/.test(digits)) return null;
  const cp5 = digits.padStart(5, "0");
  if (cp5.startsWith("97") || cp5.startsWith("98")) return cp5.slice(0, 3); // DOM/TOM
  const dep = cp5.slice(0, 2);
  if (dep === "20") return cp5 < "20200" ? "2A" : "2B"; // Corse
  return dep;
}

/** Région administrative depuis un code postal FR (null si indéterminable). */
export function regionFromCodePostal(cp?: string | null): string | null {
  const dep = departementFromCodePostal(cp);
  return dep ? DEP_TO_REGION[dep] ?? null : null;
}

/** Libellé lisible d'un département (code → « 75 · Île-de-France » best-effort). */
export function labelDepartement(dep?: string | null): string {
  return dep ? dep : "À déterminer";
}
