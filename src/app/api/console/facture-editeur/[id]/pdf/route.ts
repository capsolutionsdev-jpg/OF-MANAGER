import { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { htmlToPdf } from "@/lib/pdf";
import { factureEditeurHtml } from "@/lib/factures/editeur";
import { getEmetteur, partieFromOrg, factureDataFrom } from "@/lib/factures/editeur-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** PDF lisible d'une facture éditeur (SUPERADMIN). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const f = await prisma.factureEditeur.findUnique({ where: { id }, include: { organisme: true } });
  if (!f) return new Response("Facture introuvable", { status: 404 });

  const html = factureEditeurHtml({
    emetteur: await getEmetteur(),
    client: partieFromOrg(f.organisme),
    facture: factureDataFrom(f),
  });
  const pdf = await htmlToPdf(html);

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Facture-${f.numero ?? "brouillon"}.pdf"`,
    },
  });
}
