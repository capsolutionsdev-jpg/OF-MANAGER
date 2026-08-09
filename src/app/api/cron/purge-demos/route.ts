import { purgeExpiredDemos } from "@/lib/demo/purge";
import { assertCronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // la purge peut toucher plusieurs tables

// Tâche planifiée : supprime les tenants de DÉMONSTRATION dont le filet dur
// (demoHardExpiresAt) est dépassé — RGPD, aucune donnée démo conservée.
// Protégée par CRON_SECRET (obligatoire, en-tête Bearer).
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  const res = await purgeExpiredDemos();
  return Response.json({ ok: true, ranAt: new Date().toISOString(), ...res });
}
