import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// Sitemap XML des pages publiques (marketing). Domaine via NEXT_PUBLIC_SITE_URL
// (défaut ofmanager.info). Les espaces privés (app) sont exclus — ils redirigent
// vers /login et n'ont pas vocation à être indexés.
const BASE = SITE_URL;

// [chemin, priorité, fréquence]
const PAGES: [string, number, "weekly" | "monthly"][] = [
  ["", 1.0, "weekly"],
  ["/tarifs", 0.9, "monthly"],
  ["/solutions/tfp-aps", 0.8, "monthly"],
  ["/solutions/ssiap", 0.8, "monthly"],
  ["/solutions/sst", 0.8, "monthly"],
  ["/solutions/vtc-taxi", 0.8, "monthly"],
  ["/solutions/qualiopi", 0.8, "monthly"],
  ["/partenaires", 0.6, "monthly"],
  ["/contact", 0.6, "monthly"],
  ["/demo", 0.7, "monthly"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(([path, priority, changeFrequency]) => ({
    url: `${BASE}${path}`,
    changeFrequency,
    priority,
  }));
}
