import { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { htmlToPdf } from "@/lib/pdf";
import { factureEditeurHtml, factureCiiXml } from "@/lib/factures/editeur";
import { getEmetteur, partieFromOrg, factureDataFrom } from "@/lib/factures/editeur-data";
import { buildFacturXPdf } from "@/lib/factures/facturx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * PDF FACTUR-X d'une facture éditeur (SUPERADMIN) : PDF/A-3 hybride = PDF lisible
 * (Chromium) + XML CII EN 16931 embarqué sous le nom `factur-x.xml`. C'est le
 * fichier unique à transmettre (à la PDP, une fois branchée).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const f = await prisma.factureEditeur.findUnique({ where: { id }, include: { organisme: true } });
  if (!f) return new Response("Facture introuvable", { status: 404 });

  const emetteur = await getEmetteur();
  const client = partieFromOrg(f.organisme);
  const data = factureDataFrom(f);

  const html = factureEditeurHtml({ emetteur, client, facture: data });
  const xml = factureCiiXml({ emetteur, client, facture: data });
  const basePdf = await htmlToPdf(html);
  const facturx = await buildFacturXPdf(basePdf, xml, {
    numero: f.numero ?? "brouillon",
    date: f.dateEmission ?? new Date(),
  });

  return new Response(Buffer.from(facturx), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="factur-x-${f.numero ?? "brouillon"}.pdf"`,
    },
  });
}
