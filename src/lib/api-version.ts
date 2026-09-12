import { NextResponse } from "next/server";

/**
 * Version du CONTRAT de l'API publique (`/api/public/*`), consommée par le site
 * vitrine ET l'app mobile Capacitor (binaire distribué, non force-updatable).
 *
 * Règle (A12-014) : le contrat est ADDITIF — on n'ajoute que des champs, on n'en
 * retire ni renomme jamais sans incrémenter cette version. Les tests de contrat
 * (public-dto.test.ts) verrouillent la forme des DTO ; un client peut lire l'en-tête
 * `X-API-Version` pour détecter une évolution.
 */
export const PUBLIC_API_VERSION = "1";

/**
 * Réponse JSON standard de l'API publique : CORS ouvert + en-tête de version exposé
 * (+ cache CDN par défaut, désactivable via `cache: false` pour les 404).
 */
export function publicJson(
  data: unknown,
  init?: { status?: number; cache?: boolean },
): NextResponse {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "X-API-Version": PUBLIC_API_VERSION,
    "Access-Control-Expose-Headers": "X-API-Version",
  };
  if (init?.cache !== false) {
    headers["Cache-Control"] = "public, s-maxage=300, stale-while-revalidate=600";
  }
  return NextResponse.json(data, { status: init?.status, headers });
}
