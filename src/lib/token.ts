import { randomBytes } from "node:crypto";

/** Génère un jeton URL-safe (par défaut 24 octets → 32 caractères base64url). */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** URL de base de l'application (pour les liens envoyés par e-mail).
 * Priorité : APP_URL (à régler = domaine public, ex. https://app.capacademy.fr).
 * Filet de secours si APP_URL est oubliée en prod : le domaine de production
 * fourni par Vercel (`VERCEL_PROJECT_PRODUCTION_URL`) → évite des liens cassés
 * vers localhost / une URL périmée. */
export function appBaseUrl(): string {
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined;
  return (
    process.env.APP_URL ??
    vercelProd ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3100"
  ).replace(/\/$/, "");
}
