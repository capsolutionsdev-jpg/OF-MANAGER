import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { buildFec, serializeFec, fecFilename } from "@/lib/compta/fec";
import { collectFecInput } from "@/lib/compta/collect";

export const runtime = "nodejs";
const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

/**
 * Export FEC d'un exercice : /tresorerie/export/fec?year=2026
 * Réservé au personnel comptable, cloisonné par organisme.
 */
export async function GET(req: Request) {
  const session = await auth();
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();

  const db = await getTenantDb();
  const [input, org] = await Promise.all([collectFecInput(db, year), orgConfigFor(organismeId)]);

  const { rows } = buildFec(input);
  const content = serializeFec(rows);
  const filename = fecFilename(org.siret, year);

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
