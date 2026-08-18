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
