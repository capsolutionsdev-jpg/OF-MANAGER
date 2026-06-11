import type { NextConfig } from "next";

// En-têtes de sécurité appliqués à toutes les routes.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
  outputFileTracingIncludes: {
    "/parcours/[token]/documents": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/compte-rendu/[token]/document": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/contrat-formateur/[token]/document": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/satisfaction/[token]/document": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/documents/[inscriptionId]/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/documents/[inscriptionId]/satisfaction": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/documents/contrat-formateur/[sessionId]": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/api/cron/parcours": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/api/pdf-test": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/api/convention": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/mes-cours/[coursId]/attestation": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },
};

export default nextConfig;
