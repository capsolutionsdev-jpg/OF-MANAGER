import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { buildFec } from "@/lib/compta/fec";
import { collectFecInput } from "@/lib/compta/collect";
import { ecrituresToCsv, ecrituresFilename, PRESET_LABELS, type ComptaPreset } from "@/lib/compta/exports-compta";

export const runtime = "nodejs";
const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

/**
 * Export des écritures au format d'un logiciel comptable :
 * /tresorerie/export/ecritures?year=2026&format=pennylane
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const format = url.searchParams.get("format") ?? "tableur";
  if (!(format in PRESET_LABELS)) return new Response("Format inconnu", { status: 400 });
  const preset = format as ComptaPreset;

  const db = await getTenantDb();
  const { rows } = buildFec(await collectFecInput(db, year));
  const content = ecrituresToCsv(rows, preset);

  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ecrituresFilename(preset, year)}"`,
      "Cache-Control": "no-store",
    },
  });
}
