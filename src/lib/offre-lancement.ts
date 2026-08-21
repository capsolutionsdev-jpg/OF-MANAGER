// Offre de lancement « Pionniers OFManager » (plan de lancement, feuille 5).
//
// 15 places, date de fin ferme (jamais prolongée). Deux mécaniques :
//   A — mensuel : −40 % pendant 6 mois, sans engagement
//   B — annuel prépayé (À POUSSER) : −30 % sur 12 mois payés d'avance
// Cadeaux : mise en service + activation pack offertes. Prix gelé à vie.
// (⚠️ −50 %/12 mois de l'idée initiale = DÉCONSEILLÉ dans le plan : falaise au 13e mois.)
//
// Helpers PURS — importables partout. Le compteur de places et le stockage
// (contrat/organisme) viennent avec le branchement contrat (lot suivant).

import type { EngagementType } from "@/lib/contrats/prestation";

export type PionnierVariante = "MENSUEL_6M" | "ANNUEL_12M_PREPAYE";

type VarianteDef = {
  label: string;
  remisePct: number;
  dureeMois: number;
  engagement: EngagementType;
  prepaye: boolean;
};

export const OFFRE_PIONNIERS = {
  nom: "Pionniers OFManager",
  places: 15,
  variantes: {
    MENSUEL_6M: {
      label: "−40 % pendant 6 mois, sans engagement",
      remisePct: 40,
      dureeMois: 6,
      engagement: "MENSUEL",
      prepaye: false,
    },
    ANNUEL_12M_PREPAYE: {
      label: "−30 % sur 12 mois payés d'avance",
      remisePct: 30,
      dureeMois: 12,
      engagement: "ANNUEL",
      prepaye: true,
    },
  } satisfies Record<PionnierVariante, VarianteDef>,
  cadeaux: { miseEnServiceOfferte: true, activationPackOfferte: true },
  prixGeleAVie: true,
  contreparties: [
    "Témoignage écrit ou vidéo à 60 jours",
    "Autorisation d'usage du logo + cas chiffré",
    "1 h de point produit par trimestre",
  ],
} as const;

export type PionnierApplication = {
  variante: PionnierVariante;
  remisePct: number;
  engagement: EngagementType;
  prepaye: boolean;
  dureeMois: number;
  miseEnServiceOfferte: boolean;
  activationPackOfferte: boolean;
  prixGele: boolean;
};

/** Conditions appliquées par l'offre Pionniers selon la variante — PUR. */
export function appliquerPionniers(variante: PionnierVariante): PionnierApplication {
  const v = OFFRE_PIONNIERS.variantes[variante];
  return {
    variante,
    remisePct: v.remisePct,
    engagement: v.engagement,
    prepaye: v.prepaye,
    dureeMois: v.dureeMois,
    miseEnServiceOfferte: OFFRE_PIONNIERS.cadeaux.miseEnServiceOfferte,
    activationPackOfferte: OFFRE_PIONNIERS.cadeaux.activationPackOfferte,
    prixGele: OFFRE_PIONNIERS.prixGeleAVie,
  };
}

/** Prix mensuel net après remise Pionniers (€ HT) — PUR. */
export function prixMensuelPionnier(baseMensuel: number, variante: PionnierVariante): number {
  const { remisePct } = OFFRE_PIONNIERS.variantes[variante];
  return Math.round(baseMensuel * (1 - remisePct / 100) * 100) / 100;
}

/**
 * Montant encaissé À LA SIGNATURE selon la variante — PUR.
 *   • MENSUEL_6M         → 1 mois net (prélèvements mensuels ensuite)
 *   • ANNUEL_12M_PREPAYE → 12 mois nets payés d'avance
 */
export function montantSignaturePionnier(baseMensuel: number, variante: PionnierVariante): number {
  const net = prixMensuelPionnier(baseMensuel, variante);
  const mois = variante === "ANNUEL_12M_PREPAYE" ? 12 : 1;
  return Math.round(net * mois * 100) / 100;
}

/** Reste-t-il des places sur l'offre Pionniers ? — PUR. */
export function placesRestantes(signes: number): number {
  return Math.max(0, OFFRE_PIONNIERS.places - signes);
}
