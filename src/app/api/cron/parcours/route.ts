import { runAutomations } from "@/lib/automation-engine";
import { assertCronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche planifiée quotidienne (Vercel Cron).
// Protégée par CRON_SECRET (obligatoire) : Vercel envoie `Authorization: Bearer <CRON_SECRET>`.
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  const counts = await runAutomations();
  return Response.json({ ok: true, ranAt: new Date().toISOString(), counts });
}
