import type { MetadataRoute } from "next";

// Manifeste de l'application web (PWA). Rend OFManager installable sur
// téléphone / tablette / bureau, et sert de base à l'emballage Capacitor
// (applications iOS / Android publiables sur les stores).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OFManager",
    short_name: "OFManager",
    description:
      "Le logiciel des organismes de formation — pilotage, inscriptions, signatures et documents, à votre marque.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "fr",
    dir: "ltr",
    background_color: "#ffffff",
    theme_color: "#0D1B3E",
    categories: ["business", "productivity", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
