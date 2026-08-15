// Bibliothèque des formations activables par organisme depuis la console dev.
// Source de vérité = les catalogues de modèles réglementaires complets
// (programme, prérequis, examen, jury, pièces) :
//   - lib/catalogue-securite.ts  (SSIAP, SST, APS, A3P, vidéoprotection, dirigeant)
//   - lib/catalogue-transport.ts (VTC/Taxi continues, passerelles, TPMR)
// Cocher une formation en console la PROVISIONNE dans le catalogue du tenant.

import { CATALOGUE_SECURITE, type ModeleFormation } from "@/lib/catalogue-securite";
import { CATALOGUE_TRANSPORT } from "@/lib/catalogue-transport";

/** Tous les modèles activables, toutes familles confondues. */
export const BIBLIOTHEQUE_FORMATIONS: ModeleFormation[] = [
  ...CATALOGUE_SECURITE,
  ...CATALOGUE_TRANSPORT,
];

export const ALL_FORMATIONS = BIBLIOTHEQUE_FORMATIONS.map((m) => ({
  slug: m.cle,
  title: m.titre,
}));

/**
 * Migration d'identifiants : le commit de refonte du système de configuration
 * a renommé les `cle` des modèles (ex. `ssiap-1-initial` → `ssiap1-initial`).
 * Les organismes configurés AVANT la refonte ont des `configurationsFormations`
 * pointant sur les anciens identifiants — devenus orphelins. Cette table les
 * rattache aux clés actuelles pour que leur catalogue reste correctement filtré
 * et provisionné (auto-réparation à la lecture comme à la sauvegarde).
 *
 * Un ancien identifiant sans équivalent dans la bibliothèque actuelle (modèle
 * non repris, ex. `ssiap-2-recyclage`) est simplement ignoré.
 */
const SLUG_ALIASES: Record<string, string> = {
  "ssiap-1-initial": "ssiap1-initial",
  "ssiap-1-recyclage": "ssiap1-recyclage",
  "ssiap-1-remise-a-niveau": "ssiap1-ran",
  "ssiap-2-initial": "ssiap2-initial",
  "ssiap-3-initial": "ssiap3-initial",
  "sst-initial": "sst",
  secourisme: "sst",
  "sst-mac": "mac-sst",
  "tfp-aps-agent-prevention-securite": "tfp-aps",
  "mac-aps-recyclage": "mac-aps",
  "a3p-agent-protection-physique-personnes-initiale": "a3p-initiale",
  "dirigeant-societe-securite-privee-initiale": "dirigeant-securite-privee-initiale",
  "tpmr-mobilite-reduite": "tpmr",
};

const CLES_ACTUELLES = new Set(BIBLIOTHEQUE_FORMATIONS.map((m) => m.cle));

/**
 * Normalise une sélection d'identifiants : applique la table d'alias, ne garde
 * que les clés connues de la bibliothèque actuelle, et dédoublonne. Utilisée par
 * la sauvegarde en console, le filtre côté app et l'affichage du formulaire pour
 * que les configurations héritées d'anciennes versions restent valides.
 */
export function migrerSlugs(slugs: string[]): string[] {
  const out: string[] = [];
  for (const s of slugs) {
    const migre = SLUG_ALIASES[s] ?? s;
    if (CLES_ACTUELLES.has(migre)) out.push(migre);
  }
  return [...new Set(out)];
}

export function getFormationTitle(slug: string): string {
  return ALL_FORMATIONS.find((f) => f.slug === slug)?.title ?? slug;
}

export function getAllFormationSlugs(): string[] {
  return ALL_FORMATIONS.map((f) => f.slug);
}
