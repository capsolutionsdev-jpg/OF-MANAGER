import { runAutomations } from "@/lib/automation-engine";
import { runCircuits } from "@/lib/automation/circuits-engine";
import { runCron } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche planifiée quotidienne (Vercel Cron). Protégée par CRON_SECRET.
// 1) Jalons Qualiopi codés (inchangés). 2) Circuits visuels actifs (additif).
export function GET(req: Request) {
  return runCron(req, "parcours", async () => {
    const counts = await runAutomations();
    const circuits = await runCircuits();
    return { counts, circuits };
  });
}
