import { randomBytes } from "node:crypto";

/** Génère un jeton URL-safe (par défaut 24 octets → 32 caractères base64url). */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** URL de base de l'application (pour les liens envoyés par e-mail).
 * Priorité : APP_URL (domaine public, ex. https://app.capacademy.fr), puis le
 * domaine d'authentification (AUTH_URL / NEXTAUTH_URL = le vrai domaine public).
 * L'URL Vercel interne (`*.vercel.app`) n'est utilisée qu'en DERNIER recours :
 * elle est souvent protégée (mur de connexion Vercel) → liens de signature qui
 * mènent à une page « compte non connecté ». */
export function appBaseUrl(): string {
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined;
  return (
    process.env.APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    vercelProd ??
    "http://localhost:3100"
  ).replace(/\/$/, "");
}
