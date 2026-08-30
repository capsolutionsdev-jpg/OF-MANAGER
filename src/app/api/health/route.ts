import { prismaBase } from "@/lib/prisma";
import { healthPayload } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sonde de disponibilité pour un moniteur externe (UptimeRobot / BetterStack /
 * Vercel Monitoring). Route PUBLIQUE (exclue du matcher middleware), sans donnée
 * sensible : teste la base (SELECT 1) puis renvoie 200 ok/up ou 503 degraded/down.
 * En 503, le moniteur déclenche l'alerte (audit A08-009).
 */
export async function GET() {
  let dbOk = false;
  try {
    await prismaBase.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const { body, status } = healthPayload(dbOk);
  return Response.json(body, { status });
}
