import { purgeExpiredCandidats, purgeOldEmailLogs } from "@/lib/rgpd-retention";
import { runCron } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche planifiée : anonymise les candidats au-delà de la durée de conservation
// de leur organisme (RGPD). Protégée par CRON_SECRET.
export function GET(req: Request) {
  return runCron(req, "rgpd-purge", async () => {
    const res = await purgeExpiredCandidats();
    // Purge des journaux d'e-mails au-delà de la durée de conservation (audit A02-008).
    const logs = await purgeOldEmailLogs();
    return { ...res, ...logs };
  });
}
