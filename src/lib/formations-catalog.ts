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

export function getFormationTitle(slug: string): string {
  return ALL_FORMATIONS.find((f) => f.slug === slug)?.title ?? slug;
}

export function getAllFormationSlugs(): string[] {
  return ALL_FORMATIONS.map((f) => f.slug);
}
