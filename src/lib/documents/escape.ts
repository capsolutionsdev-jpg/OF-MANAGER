/**
 * Échappe les caractères HTML dangereux d'une valeur texte avant injection dans
 * un gabarit HTML→PDF. Empêche l'injection de balises (<script>, <img src=…>,
 * <style>@import…>) et la casse du rendu via des valeurs utilisateur contenant
 * `< > & " '` (nom, adresse, raison sociale, champs libres…). cf. §26.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Valide STRICTEMENT une image en data URL base64 (PNG/JPEG/WEBP/GIF).
 *
 * Défense anti-XSS stockée (audit OFM-03/OFM-13) : ces data URL sont réinjectées
 * TELLES QUELLES dans un attribut `<img src="…">` de gabarit HTML→PDF (variables
 * « de confiance », non ré-échappées par renderTemplate). Une valeur forgée comme
 * `data:image/png;base64,x" onerror="fetch(...)"` casse alors l'attribut et injecte
 * un gestionnaire d'événement — exécuté dans la session du staff qui ouvre la fiche
 * ET dans le Chromium headless de génération PDF (sans CSP). Le charset base64
 * strict `[A-Za-z0-9+/=]` interdit `"`, l'espace et `<>` → tout breakout est rejeté.
 *
 * À appliquer AVANT toute construction d'`<img src>` non échappé, et en amont à
 * chaque écriture d'une data URL fournie par un flux public (parcours, prospect…).
 */
export function isSafeImageDataUrl(s: string | null | undefined): boolean {
  return typeof s === "string" && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s);
}
