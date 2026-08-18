import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { facturxXmp, buildFacturXPdf } from "@/lib/factures/facturx";

describe("Factur-X — métadonnées XMP", () => {
  it("déclare PDF/A-3B + profil EN 16931 + fichier factur-x.xml", () => {
    const xmp = facturxXmp({ numero: "F-2026-0001", dateIso: "2026-08-18T00:00:00.000Z" });
    expect(xmp).toContain("<pdfaid:part>3</pdfaid:part>");
    expect(xmp).toContain("<pdfaid:conformance>B</pdfaid:conformance>");
    expect(xmp).toContain("<fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>");
    expect(xmp).toContain("<fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>");
    expect(xmp).toContain("urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#");
    expect(xmp).toContain("Facture F-2026-0001");
  });
});

describe("Factur-X — construction du PDF hybride", () => {
  it("embarque le XML sous factur-x.xml + pose le XMP, reste un PDF valide", async () => {
    // PDF de départ minimal (tient lieu du PDF Chromium).
    const base = await PDFDocument.create();
    base.addPage([300, 400]);
    const baseBytes = await base.save();

    const xml = `<?xml version="1.0" encoding="UTF-8"?><rsm:CrossIndustryInvoice>EN16931</rsm:CrossIndustryInvoice>`;
    const out = await buildFacturXPdf(baseBytes, xml, {
      numero: "F-2026-0001",
      date: new Date("2026-08-18T00:00:00.000Z"),
    });

    // C'est bien un PDF.
    expect(new TextDecoder().decode(out.slice(0, 5))).toBe("%PDF-");

    // Le nom du fichier embarqué + les marqueurs Factur-X figurent dans les octets.
    const raw = Buffer.from(out).toString("latin1");
    expect(raw).toContain("factur-x.xml");
    expect(raw).toContain("pdfaid");
    expect(raw).toContain("EN 16931");

    // Toujours rechargeable, page préservée.
    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
