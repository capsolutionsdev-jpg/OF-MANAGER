// Bibliothèque des formations activables par organisme depuis la console dev.
// Source de vérité = CATALOGUE_SECURITE (modèles réglementaires complets :
// programme, prérequis, examen, jury, pièces). Cocher une formation en console
// la PROVISIONNE dans le catalogue du tenant (création depuis le modèle).
// D'autres familles (transport VTC/Taxi…) s'ajouteront ici quand leurs modèles
// seront écrits.

import { CATALOGUE_SECURITE } from "@/lib/catalogue-securite";

export const ALL_FORMATIONS = CATALOGUE_SECURITE.map((m) => ({
  slug: m.cle,
  title: m.titre,
}));

export type FormationSlug = string;

export function getFormationTitle(slug: string): string {
  return ALL_FORMATIONS.find((f) => f.slug === slug)?.title ?? slug;
}

export function getAllFormationSlugs(): string[] {
  return ALL_FORMATIONS.map((f) => f.slug);
}
