import { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { getEmetteur, partieFromOrg, factureDataFrom } from "@/lib/factures/editeur-data";
import { renderFacturx } from "@/lib/factures/editeur-render";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * PDF FACTUR-X d'une facture éditeur (SUPERADMIN) : PDF/A-3 hybride = PDF lisible
 * (Chromium) + XML CII EN 16931 embarqué sous `factur-x.xml`. C'est le fichier
 * unique à transmettre (via la PDP, une fois branchée).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const f = await prisma.factureEditeur.findUnique({ where: { id }, include: { organisme: true } });
  if (!f) return new Response("Facture introuvable", { status: 404 });

  const facturx = await renderFacturx(
    { emetteur: await getEmetteur(), client: partieFromOrg(f.organisme), facture: factureDataFrom(f) },
    { numero: f.numero ?? "brouillon", date: f.dateEmission ?? new Date() },
  );

  return new Response(Buffer.from(facturx), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="factur-x-${f.numero ?? "brouillon"}.pdf"`,
    },
  });
}
