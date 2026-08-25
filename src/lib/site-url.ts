// Domaine canonique du site public (sitemap, robots, canonical, JSON-LD, OG).
// Priorité :
//   1. NEXT_PUBLIC_SITE_URL — override explicite (ex. migration vers ofmanager.info) ;
//   2. VERCEL_PROJECT_PRODUCTION_URL — fournie automatiquement par Vercel
//      (domaine de production du projet, ex. ofmanager.info) → zéro config ;
//   3. repli local (dev hors Vercel).
// Tous les consommateurs étant côté serveur (metadata, sitemap, robots, RSC),
// les variables non préfixées NEXT_PUBLIC y sont lisibles sans inlining.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://ofmanager.info");
