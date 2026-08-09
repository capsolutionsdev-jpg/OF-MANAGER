import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Le middleware utilise UNIQUEMENT authConfig (pas de Prisma/bcrypt → compatible edge).
const { auth } = NextAuth(authConfig);

// CSP à nonces (SEC-05) — OPTIONNELLE, derrière le flag CSP_NONCE.
//  - flag OFF (défaut) : export = `auth` brut → comportement STRICTEMENT inchangé.
//    La CSP (avec 'unsafe-inline') vient de next.config.ts, sur TOUTES les routes.
//  - flag ON : on enveloppe `auth` pour, sur les routes authentifiées (matcher),
//    REMPLACER la CSP par une version à nonce (`script-src 'self' 'nonce-…'
//    'strict-dynamic'`, sans 'unsafe-inline'). Les routes publiques (hors matcher)
//    conservent la CSP statique de next.config → aucun trou de couverture.
//    À ACTIVER seulement après vérification navigateur (préversion Vercel).
const NONCE_ON = process.env.CSP_NONCE === "true";

function cspWithNonce(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
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

const middleware = NONCE_ON
  ? auth((req) => {
      // L'autorisation (authConfig.callbacks.authorized) est appliquée par le
      // wrapper `auth` AVANT ce code (redirection si non autorisé). On n'ajoute
      // donc ici que le nonce/CSP pour les requêtes autorisées.
      const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
      const csp = cspWithNonce(nonce);
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-nonce", nonce);
      // Next lit le nonce depuis cet en-tête de REQUÊTE et l'applique à ses <script>.
      requestHeaders.set("Content-Security-Policy", csp);
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      res.headers.set("Content-Security-Policy", csp);
      return res;
    })
  : auth;

export default middleware;

export const config = {
  // Protège tout sauf : routes d'API auth, assets Next, fichiers statiques,
  // la page de login et le formulaire d'inscription public.
  matcher: [
    "/((?!api/auth|api/cron|api/pdf-test|api/lead|api/stripe|api/public|api/verification|api/civique|_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|login|inscription|tarifs|demo|contact|solutions|partenaires|prospect|parcours|signer|satisfaction-entreprise|satisfaction|positionnement|francais|reclamer|compte-rendu|contrat-formateur|emarger|devis-accept|portail/|deconnexion|.*\\..*).*)",
  ],
};
