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

// Toutes les entrées (routes ET pages) dont le code — directement ou via une
// server action déclenchée depuis la page — lance Chromium. Une server action
// s'exécute dans la fonction de la PAGE qui la déclenche : cette page doit donc
// aussi embarquer le binaire (cas du plant « envoi du lien d'inscription »).
const PDF_ENTRYPOINTS = [
  // Routes qui renvoient un PDF (contenu ou pièce jointe)
  "/api/candidats/[id]/expression-besoin",
  "/api/inscriptions/[id]/attestation-reussite",
  "/api/convention",
  "/api/cron/parcours",
  "/api/pdf-test",
  "/parcours/[token]/documents",
  "/compte-rendu/[token]/document",
  "/contrat-formateur/[token]/document",
  "/satisfaction/[token]/document",
  "/suivi/[token]/document",
  "/documents/[inscriptionId]/pdf",
  "/documents/[inscriptionId]/satisfaction",
  "/documents/contrat-formateur/[sessionId]",
  "/titres/[id]",
  "/diplomes/[id]/officiel",
  "/diplomes/[id]/attestation",
  "/examen-civique/facture/[id]",
  "/jurys/affectation/[id]/defraiement",
  "/mes-cours/[coursId]/attestation",
  // Exports (PDF conditionnel ?format=pdf → tableToPdf → Chromium)
  "/candidats/export",
  "/sessions/export",
  "/sessions/[id]/candidats/export",
  "/comptabilite/export",
  "/tresorerie/export/recap",
  "/tresorerie/export/charges",
  "/tresorerie/export/ca",
  "/formations/[id]/diplomes/export",
  "/rapports/pedagogique",
  "/examen-civique/export/comptable",
  "/examen-civique/export/pedagogique",
  // PAGES dont une server action génère un PDF (startParcours → buildSingleDocPdf,
  // certification, etc.) — le binaire doit être présent dans la fonction de la page.
  "/sessions/[id]",
  "/candidats",
  "/candidats/[id]",
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
  // via Docker. Sans effet sur Vercel, qui utilise sa propre cible de build.
  output: "standalone",
  // Les server actions reçoivent des images en data-URL (logo/cachet/signature
  // de la console, photos candidat) → relever la limite du corps de requête.
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
      // Autorise explicitement le domaine officiel ET les URL de déploiement
      // Vercel : sinon Next rejette les Server Actions quand l'hôte transmis
      // (x-forwarded-host) diffère de l'origine → erreur au submit des formulaires.
      allowedOrigins: ["app.capacademy.fr", "*.vercel.app"],
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
