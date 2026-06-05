// Utilitaires e-learning (intégration vidéo, calcul de progression).

/** Convertit un lien YouTube/Vimeo en URL d'intégration (iframe). */
export function embedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const u = url.trim();
  // YouTube
  const yt =
    u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/) ??
    null;
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo
  const vi = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  return null;
}

export type ModuleProgress = {
  total: number;
  done: number;
  pct: number;
};

/** Calcule un pourcentage arrondi. */
export function pct(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}
