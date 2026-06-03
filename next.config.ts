import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  },
};

export default nextConfig;
