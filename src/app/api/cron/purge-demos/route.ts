import { purgeExpiredDemos } from "@/lib/demo/purge";
import { runCron } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // la purge peut toucher plusieurs tables

// Tâche planifiée : supprime les tenants de DÉMONSTRATION dont le filet dur
// (demoHardExpiresAt) est dépassé — RGPD, aucune donnée démo conservée.
// Protégée par CRON_SECRET.
export function GET(req: Request) {
  return runCron(req, "purge-demos", async () => {
    const res = await purgeExpiredDemos();
    return { ...res };
  });
}
