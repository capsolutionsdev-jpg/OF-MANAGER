import { purgeExpiredCandidats } from "@/lib/rgpd-retention";
import { runCron } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche planifiée : anonymise les candidats au-delà de la durée de conservation
// de leur organisme (RGPD). Protégée par CRON_SECRET.
export function GET(req: Request) {
  return runCron(req, "rgpd-purge", async () => {
    const res = await purgeExpiredCandidats();
    return { ...res };
  });
}
