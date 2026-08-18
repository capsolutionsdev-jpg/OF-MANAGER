import { htmlToPdf } from "@/lib/pdf";
import { factureEditeurHtml, factureCiiXml, type PartieFacture, type FactureData } from "@/lib/factures/editeur";
import { buildFacturXPdf } from "@/lib/factures/facturx";

/**
 * Rend le PDF FACTUR-X (PDF lisible Chromium + XML CII EN 16931 embarqué) d'une
 * facture éditeur. Partagé par la route de téléchargement et l'action de
 * transmission PDP — une seule chaîne de génération.
 */
export async function renderFacturx(
  parties: { emetteur: PartieFacture; client: PartieFacture; facture: FactureData },
  meta: { numero: string; date: Date },
): Promise<Uint8Array> {
  const html = factureEditeurHtml(parties);
  const xml = factureCiiXml(parties);
  const pdf = await htmlToPdf(html);
  return buildFacturXPdf(pdf, xml, meta);
}
