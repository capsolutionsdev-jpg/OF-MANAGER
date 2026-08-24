// Identité légale de l'ÉDITEUR (CAP SOLUTIONS) pour les pages mentions légales,
// CGV et confidentialité de la vitrine. Les champs sensibles (SIRET, RCS, capital,
// adresse, directeur de publication) sont remplissables par variable d'environnement
// (NEXT_PUBLIC_LEGAL_*) ; à défaut, un marqueur « [à compléter] » est affiché — jamais
// de valeur inventée. Un juriste doit valider CGV + mentions avant publication.

const env = (k: string, fallback = "[à compléter]") =>
  (process.env[k]?.trim() || fallback);

export const EDITEUR = {
  raisonSociale: env("NEXT_PUBLIC_LEGAL_RAISON_SOCIALE", "CAP SOLUTIONS"),
  forme: env("NEXT_PUBLIC_LEGAL_FORME", "[forme juridique à compléter — ex. SASU]"),
  capital: env("NEXT_PUBLIC_LEGAL_CAPITAL", "[capital social à compléter]"),
  siret: env("NEXT_PUBLIC_LEGAL_SIRET"),
  rcs: env("NEXT_PUBLIC_LEGAL_RCS"),
  tva: env("NEXT_PUBLIC_LEGAL_TVA", "[n° TVA intracom. à compléter]"),
  adresse: env("NEXT_PUBLIC_LEGAL_ADRESSE"),
  directeurPublication: env("NEXT_PUBLIC_LEGAL_DIRECTEUR"),
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

export const MAJ_LEGAL = "24 août 2026";
