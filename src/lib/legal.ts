// Identité légale de l'ÉDITEUR (CAP SOLUTIONS) pour les pages mentions légales,
// CGV et confidentialité de la vitrine. Les champs sensibles (SIRET, RCS, capital,
// adresse, directeur de publication) sont remplissables par variable d'environnement
// (NEXT_PUBLIC_LEGAL_*) ; à défaut, un marqueur « [à compléter] » est affiché — jamais
// de valeur inventée. Un juriste doit valider CGV + mentions avant publication.

const env = (k: string, fallback = "[à compléter]") =>
  (process.env[k]?.trim() || fallback);

// CAP SOLUTIONS — SASU immatriculée le 20/08/2026 (SIREN 109 171 751).
// Données officielles INSEE/INPI (annuaire-entreprises.data.gouv.fr).
// Surchargables par variable d'environnement NEXT_PUBLIC_LEGAL_* si besoin.
export const EDITEUR = {
  raisonSociale: env("NEXT_PUBLIC_LEGAL_RAISON_SOCIALE", "CAP SOLUTIONS"),
  forme: env("NEXT_PUBLIC_LEGAL_FORME", "Société par Actions Simplifiée Unipersonnelle (SASU)"),
  capital: env("NEXT_PUBLIC_LEGAL_CAPITAL", "100 €"),
  siret: env("NEXT_PUBLIC_LEGAL_SIRET", "109 171 751 00018"),
  rcs: env("NEXT_PUBLIC_LEGAL_RCS", "RCS Nanterre 109 171 751"),
  tva: env("NEXT_PUBLIC_LEGAL_TVA", "FR03109171751"),
  adresse: env("NEXT_PUBLIC_LEGAL_ADRESSE", "32 rue de Paris, 92100 Boulogne-Billancourt"),
  directeurPublication: env("NEXT_PUBLIC_LEGAL_DIRECTEUR", "Moussa HAMOUMI, Président"),
  telephone: env("NEXT_PUBLIC_LEGAL_TEL", ""),
  email: env("NEXT_PUBLIC_LEGAL_EMAIL", "contact@ofmanager.info"),
  produit: "OFManager",
  // Hébergeur(s) — à confirmer selon votre infra réelle.
  hebergeur: env(
    "NEXT_PUBLIC_LEGAL_HEBERGEUR",
    "Vercel Inc. (interface applicative) et Neon Inc. (base de données) — hébergement en Union européenne",
  ),
} as const;

/** Un champ légal est-il encore un placeholder (pour signaler « à compléter ») ? */
export const estAComplter = (v: string) => v.startsWith("[");

export const MAJ_LEGAL = "30 août 2026";
