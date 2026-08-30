import { getVersionInfo } from "@/lib/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Traçabilité de version : révision déployée (SHA court + ref git + horodatage de
 * build). Route PUBLIQUE (exclue du matcher middleware) et minimale — aucune donnée
 * sensible — pour corréler un incident à un déploiement (audit A08-006).
 */
export async function GET() {
  return Response.json(getVersionInfo());
}
