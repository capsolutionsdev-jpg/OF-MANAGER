// src/lib/blog/registry.ts
// Registre éditorial du blog OFManager — SOURCE UNIQUE de vérité pour :
//   - l'index /blog (cartes),
//   - le sitemap (URL + lastModified),
//   - le maillage « articles liés » entre piliers.
// Le CORPS de chaque article vit dans son page.tsx (JSX riche) ; ici on ne garde
// que les métadonnées. Chaque page.tsx importe SA méta d'ici → titres/dates/desc
// jamais dupliqués. Ajouter un pilier = 1 entrée ici + 1 page.tsx qui la remplit.

// Chemin public du blog. NB : `/blog` est déjà pris par le CMS interne tenant
// (src/app/(app)/blog), et un groupe (app) n'ajoute pas de segment d'URL → collision.
// Le contenu marketing vit donc sous /guides. Un seul endroit à changer si ça évolue.
export const BLOG_BASE = "/guides";

export type BlogCategory = "qualiopi" | "creation-of" | "financement" | "reglementation";

export type BlogMeta = {
  slug: string;
  /** <title> SEO — absolu, < 60 caractères. */
  title: string;
  /** H1 affiché (peut différer légèrement du title). */
  h1: string;
  /** meta description — < 160 caractères. */
  description: string;
  /** Accroche sur la carte de l'index (1 phrase). */
  excerpt: string;
  category: BlogCategory;
  /** ISO (YYYY-MM-DD). */
  datePublished: string;
  /** ISO (YYYY-MM-DD) — sert le signal de fraîcheur (schema Article + « mis à jour »). */
  dateModified: string;
  /** Temps de lecture estimé, en minutes. */
  readingMinutes: number;
  /** Emoji d'illustration (carte + hero) — pas d'image lourde. */
  emoji: string;
};

export const BLOG_CATEGORIES: Record<BlogCategory, { label: string }> = {
  qualiopi: { label: "Qualiopi & qualité" },
  "creation-of": { label: "Créer son organisme" },
  financement: { label: "Financement" },
  reglementation: { label: "Réglementation métier" },
};

// Ordre = ordre d'affichage sur l'index (le plus stratégique d'abord).
export const BLOG_ARTICLES: BlogMeta[] = [
  {
    slug: "certification-qualiopi-guide",
    title: "Certification Qualiopi : le guide complet (2026)",
    h1: "Certification Qualiopi : le guide complet pour les organismes de formation",
    description:
      "Certification Qualiopi : à quoi elle sert, les 7 critères et 32 indicateurs, comment l'obtenir, le prix et les délais. Le guide complet 2026 pour les OF.",
    excerpt:
      "À quoi sert Qualiopi, les 7 critères et 32 indicateurs, les étapes pour l'obtenir, le prix, les délais — et comment préparer l'audit sans stress.",
    category: "qualiopi",
    datePublished: "2026-08-25",
    dateModified: "2026-08-25",
    readingMinutes: 9,
    emoji: "✅",
  },
  {
    slug: "ouvrir-organisme-de-formation",
    title: "Ouvrir un organisme de formation : les étapes (2026)",
    h1: "Ouvrir un organisme de formation : le guide étape par étape",
    description:
      "Comment ouvrir un organisme de formation en 2026 : déclaration d'activité (NDA), Qualiopi, obligations comptables et BPF. Le guide complet, étape par étape.",
    excerpt:
      "Déclaration d'activité (NDA), Qualiopi, règlement intérieur, BPF annuel : toutes les étapes et obligations pour créer votre OF, sans agrément ni diplôme requis.",
    category: "creation-of",
    datePublished: "2026-08-25",
    dateModified: "2026-08-25",
    readingMinutes: 8,
    emoji: "🏫",
  },
  {
    slug: "financer-formation-cpf-opco-france-travail",
    title: "Financer une formation : CPF, OPCO, France Travail",
    h1: "Financer une formation professionnelle : tous les dispositifs",
    description:
      "CPF, OPCO, France Travail, PTP, FAF : comment financer une formation professionnelle en 2026 selon votre statut. Le guide complet des dispositifs.",
    excerpt:
      "CPF, OPCO, France Travail, PTP, FAF : le bon dispositif selon votre statut (salarié, demandeur d'emploi, indépendant) — et le rôle de Qualiopi.",
    category: "financement",
    datePublished: "2026-08-25",
    dateModified: "2026-08-25",
    readingMinutes: 8,
    emoji: "💶",
  },
  {
    slug: "devenir-agent-de-securite-privee",
    title: "Devenir agent de sécurité privée : le guide (2026)",
    h1: "Devenir agent de sécurité privée : carte professionnelle, formation, CNAPS",
    description:
      "Comment devenir agent de sécurité privée : autorisation préalable CNAPS, formation TFP APS, carte professionnelle et recyclage MAC APS. Le guide 2026.",
    excerpt:
      "Autorisation préalable CNAPS, formation TFP APS, carte professionnelle, recyclage MAC : le parcours complet pour entrer dans la sécurité privée.",
    category: "reglementation",
    datePublished: "2026-08-25",
    dateModified: "2026-08-25",
    readingMinutes: 8,
    emoji: "🛡️",
  },
  {
    slug: "devenir-chauffeur-vtc-taxi",
    title: "Devenir chauffeur VTC ou taxi : le guide (2026)",
    h1: "Devenir chauffeur VTC ou taxi : carte pro, examen, formation continue",
    description:
      "Devenir chauffeur VTC ou taxi en 2026 : conditions, examen T3P via la CMA, carte professionnelle et formation continue obligatoire. Le guide complet.",
    excerpt:
      "Permis, aptitude, examen T3P via la CMA, carte pro, formation continue de 14 h : toutes les étapes pour conduire en VTC ou en taxi.",
    category: "reglementation",
    datePublished: "2026-08-25",
    dateModified: "2026-08-25",
    readingMinutes: 8,
    emoji: "🚖",
  },
];

export function getArticle(slug: string): BlogMeta | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}

/** Articles liés : les autres piliers, en privilégiant la même catégorie. */
export function relatedArticles(slug: string, n = 2): BlogMeta[] {
  const others = BLOG_ARTICLES.filter((a) => a.slug !== slug);
  const self = getArticle(slug);
  const sorted = self
    ? [...others].sort(
        (a, b) => Number(b.category === self.category) - Number(a.category === self.category),
      )
    : others;
  return sorted.slice(0, n);
}

/** Date FR lisible (ex. « 25 août 2026 ») à partir d'un ISO YYYY-MM-DD. */
export function frDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const mois = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];
  return `${d} ${mois[m - 1]} ${y}`;
}
