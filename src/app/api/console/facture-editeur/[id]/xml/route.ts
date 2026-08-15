import { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { factureCiiXml } from "@/lib/factures/editeur";
import { getEmetteur, partieFromOrg, factureDataFrom } from "@/lib/factures/editeur-data";

export const dynamic = "force-dynamic";

/** XML structuré EN 16931 / Factur-X (CII) d'une facture éditeur (SUPERADMIN). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const f = await prisma.factureEditeur.findUnique({ where: { id }, include: { organisme: true } });
  if (!f) return new Response("Facture introuvable", { status: 404 });

  const xml = factureCiiXml({
    emetteur: await getEmetteur(),
    client: partieFromOrg(f.organisme),
    facture: factureDataFrom(f),
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="Facture-${f.numero ?? "brouillon"}.xml"`,
    },
  });
}
