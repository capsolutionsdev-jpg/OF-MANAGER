import { purgeExpiredCandidats, purgeOldEmailLogs } from "@/lib/rgpd-retention";
import { assertCronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche planifiée : anonymise les candidats au-delà de la durée de conservation
// de leur organisme (RGPD). Protégée par CRON_SECRET (obligatoire, en-tête Bearer).
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  const res = await purgeExpiredCandidats();
  // Purge des journaux d'e-mails au-delà de la durée de conservation (audit A02-008).
  const logs = await purgeOldEmailLogs();
  return Response.json({ ok: true, ranAt: new Date().toISOString(), ...res, ...logs });
}
