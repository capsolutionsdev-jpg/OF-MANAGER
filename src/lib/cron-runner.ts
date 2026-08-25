import { assertCronAuthorized } from "@/lib/cron-auth";
import { reportError } from "@/lib/observability/report-error";

/**
 * Enveloppe standard d'une route Cron (Vercel) : vérifie CRON_SECRET, exécute la
 * tâche dans un try/catch, REPORTE toute erreur (Sentry + logs via reportError) et
 * renvoie une réponse JSON cohérente. Vercel Cron ne réessaie pas → sans ce filet,
 * un cron qui échoue passe totalement inaperçu (audit PC-INFRA-11/12).
 *
 * `fn` renvoie les champs de résultat à fusionner dans la réponse `{ ok, ranAt, ... }`.
 */
export async function runCron(
  req: Request,
  tag: string,
  fn: () => Promise<Record<string, unknown> | void>,
): Promise<Response> {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;
  try {
    const data = (await fn()) ?? {};
    return Response.json({ ok: true, ranAt: new Date().toISOString(), ...data });
  } catch (e) {
    await reportError(e, { tag: `cron:${tag}` });
    return Response.json(
      { ok: false, error: "cron_failed", ranAt: new Date().toISOString() },
      { status: 500 },
    );
  }
}
