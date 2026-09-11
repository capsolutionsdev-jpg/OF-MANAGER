/**
 * Signature accessible — alternative clavier au tracé manuscrit (WCAG 2.1.1).
 *
 * Le backend n'accepte qu'un `data:image/...` (cf. `lib/actions/parcours-actions`).
 * Pour rendre la signature accessible aux personnes qui ne peuvent pas DESSINER
 * (clavier seul, lecteur d'écran, motricité réduite), on rend le NOM SAISI sur le
 * MÊME canvas : on produit donc un vrai PNG, sans changer le contrat serveur ni le
 * chemin de dessin existant (correctif purement additif).
 */

/** Normalise un nom de signataire : espaces compactés, trim, longueur bornée. Pur. */
export function normalizeSignatureName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Nombre minimal de caractères pour accepter une signature saisie. */
export const MIN_SIGNATURE_NAME = 2;

/** True si le nom saisi est suffisant pour constituer une signature. Pur. */
export function isValidSignatureName(raw: string): boolean {
  return normalizeSignatureName(raw).length >= MIN_SIGNATURE_NAME;
}

/**
 * Rend le nom saisi comme une signature « script » sur le canvas fourni et renvoie
 * le data URL PNG (ou `null` si canvas/contexte absent, ou nom trop court).
 * Effet de bord DOM (dessine sur le canvas) → vérifié en navigateur, pas en unité.
 */
export function renderTypedSignature(
  canvas: HTMLCanvasElement | null,
  rawName: string,
): string | null {
  const name = normalizeSignatureName(rawName);
  if (!canvas) return null;
  const g = canvas.getContext("2d");
  if (!g) return null;
  g.clearRect(0, 0, canvas.width, canvas.height);
  if (name.length < MIN_SIGNATURE_NAME) return null;
  g.fillStyle = "#111111";
  g.textBaseline = "middle";
  g.textAlign = "center";
  const fontAt = (s: number) =>
    `italic ${s}px "Segoe Script", "Brush Script MT", "Snell Roundhand", cursive`;
  let size = Math.round(canvas.height * 0.42);
  g.font = fontAt(size);
  const maxWidth = canvas.width - 48;
  while (size > 16 && g.measureText(name).width > maxWidth) {
    size -= 2;
    g.font = fontAt(size);
  }
  g.fillText(name, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL("image/png");
}
