import "server-only";
import { timingSafeEqual } from "crypto";

// Garde d'authentification des routes cron (Vercel Cron).
// SÉCURITÉ : échec fermé — `CRON_SECRET` est OBLIGATOIRE. En son absence, ou si
// l'en-tête `Authorization: Bearer <CRON_SECRET>` ne correspond pas, on refuse.
// Le secret n'est PLUS accepté en query string (`?secret=`) : il fuiterait dans
// les logs d'accès / le Referer. Vercel Cron envoie automatiquement l'en-tête
// Bearer dès que `CRON_SECRET` est défini dans l'environnement du projet.
// Comparaison à TEMPS CONSTANT (A12-020), cohérente avec les webhooks.
export function assertCronAuthorized(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(provided, `Bearer ${secret}`)) {
    return new Response("Non autorisé", { status: 401 });
  }
  return null;
}

/** Égalité de chaînes à temps constant (évite le canal temporel sur le secret). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
