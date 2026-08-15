import { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { htmlToPdf } from "@/lib/pdf";
import { contratPrestationHtml } from "@/lib/contrats/prestation";
import { getPrestataire, clientFromOrg, contratDataFrom } from "@/lib/contrats/prestation-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** PDF du contrat de prestation (SUPERADMIN — console éditeur). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const contrat = await prisma.contratPrestation.findUnique({
    where: { id },
    include: { organisme: true },
  });
  if (!contrat) return new Response("Contrat introuvable", { status: 404 });

  const html = contratPrestationHtml({
    prestataire: await getPrestataire(),
    client: clientFromOrg(contrat.organisme),
    contrat: contratDataFrom(contrat),
  });
  const pdf = await htmlToPdf(html);

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Contrat-${contrat.reference}.pdf"`,
    },
  });
}
