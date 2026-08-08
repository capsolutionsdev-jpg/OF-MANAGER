import type { MetadataRoute } from "next";

// robots.txt généré. Le domaine vient de NEXT_PUBLIC_SITE_URL (défaut ofmanager.fr) —
// changer de domaine = 1 variable d'env, sans toucher au code.
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ofmanager.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Zones privées / techniques : inutiles à l'index (redirigent vers /login
        // ou renvoient du JSON). On garde le site marketing entièrement indexable.
        disallow: ["/api/", "/console", "/dashboard", "/mon-espace", "/deconnexion"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
