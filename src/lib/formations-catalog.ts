// Catalogue complet des formations disponibles dans OF Manager.
// Slugs stables utilisés pour :
// - Configuration tenant (quelles formations un organisme utilise)
// - Détection de type pour les prérequis (public-inscription-form.tsx)
// - Paramétrage jury/grille (console)

export const ALL_FORMATIONS = [
  // SSIAP
  { slug: "ssiap-1-initial", title: "SSIAP 1 Initial" },
  { slug: "ssiap-1-recyclage", title: "SSIAP 1 Recyclage" },
  { slug: "ssiap-1-remise-a-niveau", title: "SSIAP 1 Remise à niveau" },
  { slug: "ssiap-2-initial", title: "SSIAP 2 Initial" },
  { slug: "ssiap-2-recyclage", title: "SSIAP 2 Recyclage" },
  { slug: "ssiap-3-initial", title: "SSIAP 3 Initial" },
  { slug: "ssiap-3-recyclage", title: "SSIAP 3 Recyclage" },

  // SST
  { slug: "sst-initial", title: "SST Initial" },
  { slug: "sst-mac", title: "SST MAC (Maintien et Actualisation)" },

  // APS (Agent Prévention Sécurité)
  { slug: "tfp-aps-agent-prevention-securite", title: "TFP APS Agent Prévention Sécurité" },
  { slug: "mac-aps-recyclage", title: "MAC APS Recyclage" },
  { slug: "a3p-agent-protection-physique-personnes-initiale", title: "A3P Agent Protection Physique Initial" },
  { slug: "a3p-agent-protection-physique-personnes-vae", title: "A3P Agent Protection Physique VAE" },
  { slug: "operateur-videoprotection-initiale", title: "Opérateur Vidéoprotection Initial" },
  { slug: "operateur-videoprotection-vae", title: "Opérateur Vidéoprotection VAE" },
  { slug: "dirigeant-societe-securite-privee-initiale", title: "Dirigeant Société Sécurité Privée Initial" },

  // Transport (VTC / Taxi)
  { slug: "vtc-formation-continue", title: "Formation Continue VTC" },
  { slug: "taxi-formation-continue", title: "Formation Continue Taxi" },
  { slug: "passerelle-vtc-taxi", title: "Passerelle VTC → Taxi" },
  { slug: "passerelle-taxi-vtc", title: "Passerelle Taxi → VTC" },
  { slug: "tpmr-mobilite-reduite", title: "TPMR Mobilité Réduite" },

  // Autres
  { slug: "secourisme", title: "Secourisme" },
  { slug: "prap-prevention-risques", title: "PRAP Prévention des Risques" },
] as const;

export type FormationSlug = (typeof ALL_FORMATIONS)[number]["slug"];

export function getFormationTitle(slug: string): string {
  return ALL_FORMATIONS.find((f) => f.slug === slug)?.title ?? slug;
}

export function getAllFormationSlugs(): FormationSlug[] {
  return ALL_FORMATIONS.map((f) => f.slug as FormationSlug);
}
