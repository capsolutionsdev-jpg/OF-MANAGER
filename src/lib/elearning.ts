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

/** Seuil de réussite d'un quiz (50 %). */
export const QUIZ_SEUIL = 0.5;

/** Un résultat de quiz est-il réussi ? */
export function quizReussi(score: number, total: number): boolean {
  return total === 0 || score / total >= QUIZ_SEUIL;
}

export type LeconLite = { id: string; quizJson: unknown };

/**
 * Le cours est-il complété (attestation déverrouillée) ?
 * Exige : toutes les leçons publiées terminées ET chaque leçon AVEC quiz réussie.
 */
export function coursComplete(
  lecons: LeconLite[],
  doneLeconIds: Set<string>,
  quizResultats: { leconId: string; score: number; total: number }[],
): boolean {
  if (lecons.length === 0) return false;
  const toutesFaites = lecons.every((l) => doneLeconIds.has(l.id));
  if (!toutesFaites) return false;
  const passByLecon = new Map(quizResultats.map((q) => [q.leconId, quizReussi(q.score, q.total)]));
  const aQuiz = (l: LeconLite) => Array.isArray(l.quizJson) && (l.quizJson as unknown[]).length > 0;
  return lecons.filter(aQuiz).every((l) => passByLecon.get(l.id) === true);
}
