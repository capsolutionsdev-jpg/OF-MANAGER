import "server-only";
import sanitizeHtmlLib from "sanitize-html";

/**
 * Assainit le HTML riche d'une leçon e-learning avant rendu (audit SEC-026 / F-02).
 * Neutralise <script>, <style>, les gestionnaires d'événement inline (onerror,
 * onload…), les schémas dangereux (javascript:) et les balises d'inclusion
 * (iframe/object/embed), tout en PRÉSERVANT la mise en forme (titres, listes,
 * tableaux, liens, images, gras/italique, couleurs). Appliqué au RENDU côté
 * serveur → couvre aussi le contenu déjà stocké.
 */
export function sanitizeLessonHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return sanitizeHtmlLib(dirty, {
    allowedTags: sanitizeHtmlLib.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "figure",
      "figcaption",
      "span",
      "u",
      "s",
      "sup",
      "sub",
    ]),
    allowedAttributes: {
      ...sanitizeHtmlLib.defaults.allowedAttributes,
      "*": ["class", "style"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    // Liens ouvrant un nouvel onglet : forcer un rel sûr.
    transformTags: {
      a: sanitizeHtmlLib.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
    // sanitize-html retire par défaut <script>/<style> et TOUT attribut on*.
  });
}
