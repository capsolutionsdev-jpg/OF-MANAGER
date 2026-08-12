import { headers } from "next/headers";

/**
 * Vrai quand la requête provient de l'APPLICATION MOBILE native (conteneur
 * Capacitor), faux depuis un navigateur web classique.
 *
 * Repose sur `appendUserAgent: "OFManagerApp"` (capacitor.config.ts) : la WebView
 * native ajoute ce jeton à son User-Agent. On l'utilise pour basculer en
 * « mode application » (masquer l'habillage vitrine, pied de page marketing…)
 * sans toucher au rendu côté web.
 *
 * ⚠️ À n'appeler que depuis un layout/page DYNAMIQUE (lecture des en-têtes) —
 * l'espace `(app)` l'est déjà (`export const dynamic = "force-dynamic"`).
 */
export async function isNativeApp(): Promise<boolean> {
  const ua = (await headers()).get("user-agent") ?? "";
  return ua.includes("OFManagerApp");
}
