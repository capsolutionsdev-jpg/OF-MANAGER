import { recordMrrSnapshot } from "@/lib/mrr-snapshot";
import { runCron } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron MENSUEL : enregistre le snapshot MRR du mois (idempotent). Base des
// analytics (courbe MRR, waterfall, cohortes). Protégé par CRON_SECRET.
export function GET(req: Request) {
  return runCron(req, "mrr-snapshot", async () => {
    const { mois, total } = await recordMrrSnapshot();
    return { mois, total };
  });
}
