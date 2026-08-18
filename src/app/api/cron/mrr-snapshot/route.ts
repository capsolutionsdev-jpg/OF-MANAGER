import { assertCronAuthorized } from "@/lib/cron-auth";
import { recordMrrSnapshot } from "@/lib/mrr-snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron MENSUEL : enregistre le snapshot MRR du mois (idempotent). Base des
// analytics (courbe MRR, waterfall, cohortes). Protégé par CRON_SECRET.
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  const { mois, total } = await recordMrrSnapshot();
  return Response.json({ ok: true, mois, total, ranAt: new Date().toISOString() });
}
