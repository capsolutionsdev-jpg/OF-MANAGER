import { randomBytes } from "node:crypto";

/** Génère un jeton URL-safe (par défaut 24 octets → 32 caractères base64url). */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** URL de base de l'application (pour les liens envoyés par e-mail). */
export function appBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3100"
  ).replace(/\/$/, "");
}
