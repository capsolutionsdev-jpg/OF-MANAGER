import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { BLOG_ARTICLES, BLOG_BASE } from "@/lib/blog/registry";
import { GLOSSAIRE, GLOSSAIRE_BASE } from "@/lib/glossaire/terms";

// Sitemap XML des pages publiques (marketing). Domaine via NEXT_PUBLIC_SITE_URL
// (défaut ofmanager.info). Les espaces privés (app) sont exclus — ils redirigent
// vers /login et n'ont pas vocation à être indexés.
const BASE = SITE_URL;

// [chemin, priorité, fréquence]
const PAGES: [string, number, "weekly" | "monthly"][] = [
  ["", 1.0, "weekly"],
  ["/fonctionnalites", 0.9, "monthly"],
  ["/tarifs", 0.9, "monthly"],
  ["/guides", 0.8, "weekly"],
  ["/glossaire", 0.6, "monthly"],
  ["/solutions/tfp-aps", 0.8, "monthly"],
  ["/solutions/ssiap", 0.8, "monthly"],
  ["/solutions/sst", 0.8, "monthly"],
  ["/solutions/vtc-taxi", 0.8, "monthly"],
  ["/solutions/qualiopi", 0.8, "monthly"],
  ["/partenaires", 0.6, "monthly"],
  ["/contact", 0.6, "monthly"],
  ["/demo", 0.7, "monthly"],
  ["/verification", 0.6, "monthly"], // outil anti-fraude public (différenciateur)
  ["/mentions-legales", 0.3, "monthly"],
  ["/cgv", 0.3, "monthly"],
  ["/confidentialite", 0.3, "monthly"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = PAGES.map(([path, priority, changeFrequency]) => ({
    url: `${BASE}${path}`,
    changeFrequency,
    priority,
  }));

  // Articles de blog : lastModified vient du registre (signal de fraîcheur AEO/SEO).
  const blogPages: MetadataRoute.Sitemap = BLOG_ARTICLES.map((a) => ({
    url: `${BASE}${BLOG_BASE}/${a.slug}`,
    lastModified: new Date(a.dateModified),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // Termes du glossaire.
  const glossairePages: MetadataRoute.Sitemap = GLOSSAIRE.map((t) => ({
    url: `${BASE}${GLOSSAIRE_BASE}/${t.slug}`,
    changeFrequency: "yearly",
    priority: 0.4,
  }));

  return [...staticPages, ...blogPages, ...glossairePages];
}
