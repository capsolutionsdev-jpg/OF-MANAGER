import type { NextConfig } from "next";

// Content-Security-Policy. 'unsafe-inline' reste nécessaire (scripts de bootstrap
// Next + styles inline de la charte tenant) ; 'unsafe-eval' uniquement en dev
// (HMR). Durcit malgré tout : object-src none, base-uri/form-action self,
// frame-ancestors self. Images : data:/blob:/https: (logos, photos, Vercel Blob).
function contentSecurityPolicy(): string {
  const dev = process.env.NODE_ENV !== "production";
  const scriptSrc = `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`;
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

// En-têtes de sécurité appliqués à toutes les routes.
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

// Binaire Chromium (@sparticuz) à embarquer dans les fonctions serverless qui
// génèrent un PDF — sinon « Could not find Chromium » sur Vercel.
const CHROMIUM_BIN = ["./node_modules/@sparticuz/chromium/bin/**"];

// Entrées (routes ET pages) dont le code — directement ou via une server action
// déclenchée depuis la page — lance Chromium. Une server action s'exécute dans la
// fonction de la PAGE qui la déclenche : cette page doit donc aussi embarquer le
// binaire (cas du plant « envoi du lien d'inscription »).
//
// ⚠️ Les clés sont matchées en GLOB : un segment dynamique entre crochets
// (`[id]`, `[token]`) est interprété comme une CLASSE DE CARACTÈRES et ne matche
// donc PAS la route littérale → le binaire n'est pas injecté (vérifié via les
// `.nft.json` du build : `/sessions/[id]` échouait, `/candidats` réussissait).
// On utilise donc des PRÉFIXES SANS CROCHETS, qui couvrent tout le sous-arbre.
const PDF_ENTRYPOINTS = [
  // API PDF
  "/api/pdf-test",
  "/api/convention",
  "/api/cron/parcours",
  "/api/candidats", // expression-besoin
  "/api/inscriptions", // attestation-reussite
  "/api/parcours-t3p", // fiche de suivi du parcours T3P
  // Routes PDF publiques (liens tokenisés)
  "/parcours",
  "/compte-rendu",
  "/contrat-formateur",
  "/satisfaction",
  "/suivi",
  // Routes PDF back-office (dossier, titres, diplômes, factures, défraiement…)
  "/documents",
  "/titres",
  "/diplomes",
  "/jurys/affectation",
  "/examen-civique/facture",
  "/examen-civique/export",
  "/mes-cours",
  "/formations",
  // Exports (PDF conditionnel ?format=pdf → tableToPdf → Chromium)
  "/comptabilite",
  "/tresorerie",
  "/rapports",
  // PAGES dont une server action génère un PDF (startParcours → buildSingleDocPdf,
  // certification…) — le binaire doit être présent dans la fonction de la page.
  "/sessions",
  "/candidats",
  "/crm",
  "/signatures",
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Épingle la racine du projet : évite que Next infère un mauvais workspace root
  // à cause d'un package-lock.json parasite ailleurs sur la machine (ex.
  // C:\Users\…\package-lock.json). Fiabilise aussi le tracing du build standalone.
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  // Sortie autonome (server.js + deps minimales) pour le déploiement self-host
  // via Docker. UNIQUEMENT hors Vercel : sur Vercel, le mode "standalone" range
  // les fichiers de tracing autrement et casse l'empaquetage serverless
  // (« ENOENT .next/next-server.js.nft.json » au build). Vercel utilise sa propre
  // cible → on laisse `output` par défaut là-bas.
  output: process.env.VERCEL ? undefined : "standalone",
  // Les server actions reçoivent des images en data-URL (logo/cachet/signature
  // de la console, photos candidat) → relever la limite du corps de requête.
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
      // Autorise explicitement le domaine officiel ET les URL de déploiement
      // Vercel : sinon Next rejette les Server Actions quand l'hôte transmis
      // (x-forwarded-host) diffère de l'origine → erreur au submit des formulaires.
      // Correctif audit P2-5 : restreint aux préversions DU PROJET (au lieu de
      // tout *.vercel.app, qui autoriserait un déploiement tiers comme origine
      // de Server Action). Défense en profondeur (les cookies SameSite=Lax
      // atténuent déjà le CSRF cross-site).
      allowedOrigins: ["app.capacademy.fr", "cap-competence-manager-*.vercel.app"],
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Ne pas empaqueter les libs PDF/headless-chrome (chargées au runtime serveur)
  serverExternalPackages: [
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium",
  ],
  // Force l'inclusion du binaire Chromium (@sparticuz) dans les fonctions
  // serverless qui génèrent des PDF — sinon « Could not find Chromium » sur Vercel.
  // Couvre routes + pages hébergeant une server action PDF (cf. PDF_ENTRYPOINTS).
  outputFileTracingIncludes: Object.fromEntries(
    PDF_ENTRYPOINTS.map((p) => [p, CHROMIUM_BIN]),
  ),
};

export default nextConfig;
