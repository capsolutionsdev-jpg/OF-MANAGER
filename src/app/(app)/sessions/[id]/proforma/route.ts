import { auth } from "@/auth";
import { exportRateLimited } from "@/lib/security/export-guard";
import { orgConfigFor } from "@/lib/org-identity";
import { loadSessionProformas } from "@/lib/factures/proforma-data";
import { buildProformaPdf } from "@/lib/factures/proforma-pdf";

export const runtime = "nodejs";
export const maxDuration = 60; // génération Chromium (cf. lib/pdf.ts)
const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

/**
 * PDF « facture proforma » d'une session, pour une cible (candidat B2C ou convention B2B).
 * OFMANAGER pré-remplit : la proforma prépare la facturation, l'OF émet chez lui. (A06-003)
 *   GET /sessions/{id}/proforma?cible=candidat:<inscriptionId>|convention:<conventionId>
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const limited = exportRateLimited(session.user.id);
  if (limited) return limited;

  const { id } = await params;
  const cibleKey = new URL(req.url).searchParams.get("cible");
  if (!cibleKey) return new Response("Paramètre « cible » requis", { status: 400 });

  const res = await loadSessionProformas(id);
  if (!res) return new Response("Session introuvable", { status: 404 });
  const cible = res.cibles.find((c) => c.key === cibleKey);
  if (!cible) return new Response("Proforma introuvable", { status: 404 });

  const org = await orgConfigFor(session.user.organismeId ?? null);
  const suffixe = (cibleKey.split(":")[1] ?? "").slice(0, 6);
  const numero = `PROFORMA-${new Date().getFullYear()}-${res.session.ref}-${suffixe}`.replace(/[^\w-]+/g, "-");

  const { data, filename } = await buildProformaPdf(cible, org, {
    numero,
    dateEmission: new Date(),
    sessionRef: res.session.ref,
  });

  return new Response(Buffer.from(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
