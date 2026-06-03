import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { orgConfig } from "@/lib/org-config";

export type CertificatData = {
  candidatNom: string;
  candidatEmail: string;
  formation: string;
  documents: string[];
  signataire: string;
  signedAt: Date;
  ip: string | null;
  ref: string;
};

/**
 * Génère un « Certificat de signature électronique » (PDF) servant de
 * piste d'audit / preuve de la signature avancée.
 */
export async function buildCertificatPdf(data: CertificatData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4 portrait (points)
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.05, 0.11, 0.24);
  const gray = rgb(0.3, 0.3, 0.3);
  const line = rgb(0.8, 0.8, 0.8);
  let y = 800;
  const left = 50;

  const text = (
    s: string,
    opts: { size?: number; bold?: boolean; color?: typeof navy; x?: number } = {},
  ) => {
    page.drawText(s, {
      x: opts.x ?? left,
      y,
      size: opts.size ?? 10,
      font: opts.bold ? bold : font,
      color: opts.color ?? gray,
    });
  };

  // En-tête organisme
  text(orgConfig.name, { size: 14, bold: true, color: navy });
  y -= 16;
  text(`${orgConfig.adresse}`, { size: 8 });
  y -= 11;
  text(`SIRET ${orgConfig.siret} · NDA ${orgConfig.nda}`, { size: 8 });
  y -= 30;

  // Titre
  text("CERTIFICAT DE SIGNATURE ÉLECTRONIQUE", { size: 15, bold: true, color: navy });
  y -= 8;
  page.drawLine({
    start: { x: left, y },
    end: { x: 545, y },
    thickness: 1,
    color: line,
  });
  y -= 24;

  text(
    "Le présent certificat atteste qu'une signature électronique avancée a été",
    { size: 10 },
  );
  y -= 13;
  text(
    "apposée sur les documents listés ci-dessous, avec consentement horodaté.",
    { size: 10 },
  );
  y -= 28;

  const row = (label: string, value: string) => {
    text(label, { size: 9, bold: true, color: navy });
    page.drawText(value, { x: left + 160, y, size: 10, font, color: gray });
    y -= 18;
  };

  row("Signataire", data.signataire);
  row("E-mail", data.candidatEmail);
  row("Formation", data.formation);
  row("Date et heure", data.signedAt.toLocaleString("fr-FR"));
  row("Adresse IP", data.ip ?? "—");
  row("Référence de preuve", data.ref);
  y -= 10;

  text("Documents signés :", { size: 9, bold: true, color: navy });
  y -= 16;
  for (const doc of data.documents) {
    text(`•  ${doc}`, { size: 10, x: left + 10 });
    y -= 15;
  }
  y -= 16;

  page.drawLine({
    start: { x: left, y },
    end: { x: 545, y },
    thickness: 1,
    color: line,
  });
  y -= 18;
  text(
    "Signature électronique de niveau « avancé » (eIDAS art. 26) : identification du",
    { size: 8 },
  );
  y -= 11;
  text(
    "signataire, lien aux données signées, horodatage et traçabilité (IP, référence).",
    { size: 8 },
  );
  y -= 22;
  text(
    `Émis par ${orgConfig.name} — ${new Date().toLocaleString("fr-FR")}`,
    { size: 8 },
  );

  return await pdf.save();
}
