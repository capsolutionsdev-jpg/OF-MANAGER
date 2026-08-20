import { randomBytes } from "node:crypto";

/** Génère un jeton URL-safe (par défaut 24 octets → 32 caractères base64url). */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** Fenêtre de validité par défaut d'un lien tokenisé lié à une session (mois). */
export const LINK_VALIDITY_MONTHS = 12;

/**
 * Un lien tokenisé lié à une session est-il EXPIRÉ ? Par défaut, valable jusqu'à
 * 12 mois après la fin de la session — limite l'exposition d'un lien fuité sans
 * gêner un usage normal (personne ne complète/consulte 1 an après). Les tokens
 * étant à 192 bits (non devinables), seule la fuite d'un lien est concernée.
 * dateFin absente → jamais expiré (on ne bloque pas par défaut).
 */
export function linkExpired(
  sessionDateFin: Date | null | undefined,
  months = LINK_VALIDITY_MONTHS,
): boolean {
  if (!sessionDateFin) return false;
  const limit = new Date(sessionDateFin);
  limit.setMonth(limit.getMonth() + months);
  return new Date() > limit;
}

/** Un jour en millisecondes. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Durées de validité (en JOURS) par type de lien tokenisé — politique produit :
 *  - SIGNATURE : liens d'action/signature (60 j) ;
 *  - SURVEY : liens d'enquête (180 j).
 * Les liens de session s'appuient plutôt sur `linkExpired(dateFin, mois)`
 * (ancré à la fin de session) ; ces durées servent aux liens SANS session
 * (prospect, acceptation de devis), via `generateExpiringToken`.
 */
export const LINK_TTL_DAYS = { SIGNATURE: 60, SURVEY: 180 } as const;

/**
 * Jeton URL-safe À DURÉE DE VIE : `<aléatoire base64url>~<émission base36>`.
 * L'horodatage d'émission fait PARTIE du jeton (donc de la clé stockée en base) :
 * le modifier casse la recherche par token → il ne peut pas être forgé pour
 * prolonger la validité (le secret reste les 192 bits aléatoires). Pour les liens
 * sans session de référence (prospect, devis), où l'on ne peut pas s'ancrer sur
 * une date de fin de session. Séparateur `~` (URL-safe, absent de l'alphabet
 * base64url et sans collision avec l'exclusion `.` du matcher middleware).
 */
export function generateExpiringToken(bytes = 24): string {
  return `${randomBytes(bytes).toString("base64url")}~${Date.now().toString(36)}`;
}

/**
 * Un jeton à durée de vie (émis par `generateExpiringToken`) est-il EXPIRÉ ?
 * Les jetons SANS horodatage (anciens, émis avant cette fonctionnalité) sont
 * considérés NON expirés — aucun lien déjà distribué ne casse (grandfathering).
 * `now` injectable pour les tests.
 */
export function expiringTokenExpired(
  token: string,
  ttlDays: number,
  now: number = Date.now(),
): boolean {
  const sep = token.lastIndexOf("~");
  if (sep < 0) return false; // legacy : pas d'horodatage → jamais expiré
  const issued = parseInt(token.slice(sep + 1), 36);
  if (!Number.isFinite(issued)) return false; // illisible → on ne bloque pas
  return now - issued > ttlDays * DAY_MS;
}

/** Domaine public de la plateforme (liens de signature/inscription envoyés par
 * e-mail). Les URL Vercel (`*.vercel.app`) sont protégées par un mur de connexion
 * Vercel → JAMAIS utilisées pour ces liens publics. */
// TODO CAP SOLUTIONS : domaine commercial définitif (repli utilisé seulement si
// APP_URL / AUTH_URL / NEXTAUTH_URL ne sont pas définis en prod).
const DEFAULT_PUBLIC_URL = "https://ofmanager.info";

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
