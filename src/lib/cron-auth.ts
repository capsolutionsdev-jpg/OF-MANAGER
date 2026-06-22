import "server-only";

// Garde d'authentification des routes cron (Vercel Cron).
// SÉCURITÉ : échec fermé — `CRON_SECRET` est OBLIGATOIRE. En son absence, ou si
// l'en-tête `Authorization: Bearer <CRON_SECRET>` ne correspond pas, on refuse.
// Le secret n'est PLUS accepté en query string (`?secret=`) : il fuiterait dans
// les logs d'accès / le Referer. Vercel Cron envoie automatiquement l'en-tête
// Bearer dès que `CRON_SECRET` est défini dans l'environnement du projet.
export function assertCronAuthorized(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  return null;
}
