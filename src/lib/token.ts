import { randomBytes } from "node:crypto";

/** Génère un jeton URL-safe (par défaut 24 octets → 32 caractères base64url). */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** Domaine public de la plateforme (liens de signature/inscription envoyés par
 * e-mail). Les URL Vercel (`*.vercel.app`) sont protégées par un mur de connexion
 * Vercel → JAMAIS utilisées pour ces liens publics. */
const DEFAULT_PUBLIC_URL = "https://app.capacademy.fr";

/** URL de base de l'application (pour les liens envoyés par e-mail).
 * Priorité : APP_URL / AUTH_URL / NEXTAUTH_URL (le vrai domaine public). En prod
 * (Vercel), on retombe sur le domaine public connu — jamais sur `*.vercel.app`
 * (protégé). En local, sur http://localhost:3100. */
export function appBaseUrl(): string {
  const explicit = process.env.APP_URL ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  // On refuse une URL Vercel de déploiement (protégée) même si elle est fournie.
  const clean = explicit && !explicit.includes(".vercel.app") ? explicit : undefined;
  const fallback = process.env.VERCEL ? DEFAULT_PUBLIC_URL : "http://localhost:3100";
  return (clean ?? fallback).replace(/\/$/, "");
}
