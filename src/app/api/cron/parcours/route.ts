import { runAutomations } from "@/lib/automation-engine";
import { runCircuits } from "@/lib/automation/circuits-engine";
import { assertCronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche planifiée quotidienne (Vercel Cron).
// Protégée par CRON_SECRET (obligatoire) : Vercel envoie `Authorization: Bearer <CRON_SECRET>`.
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  // 1) Jalons Qualiopi codés (inchangés). 2) Circuits visuels actifs (additif).
  const counts = await runAutomations();
  const circuits = await runCircuits();
  return Response.json({ ok: true, ranAt: new Date().toISOString(), counts, circuits });
}
