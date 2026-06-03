import { promises as fs } from "node:fs";
import path from "node:path";
import HTMLtoDOCX from "@turbodocx/html-to-docx";
import { prisma } from "@/lib/prisma";
import {
  compteRenduFormateurHtml,
  renderTemplate,
} from "@/lib/documents/templates";
import { orgConfig } from "@/lib/org-config";

export const runtime = "nodejs";

const DOC_STYLE = `<style>
  h1 { font-size: 18pt; text-align: center; margin-bottom: 16pt; }
  h2 { font-size: 11pt; margin: 12pt 0 2pt; }
  p, td, th, li { font-size: 10pt; line-height: 1.5; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  td, th { border: 1px solid #888; padding: 4px 6px; }
  .doc-footer { font-size: 8pt; color: #555; margin-top: 16pt; }
</style>`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const s = await prisma.session.findUnique({
    where: { crFormateurToken: token },
    include: { formation: true, formateurs: true },
  });
  if (!s) return new Response("Lien invalide", { status: 404 });

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const f = s.formateurs[0];
  const rep = (s.crFormateurJson ?? {}) as Record<string, string>;

  const vars: Record<string, string> = {
    organisme: orgConfig.name,
    organisme_representant: orgConfig.representant,
    organisme_siret: orgConfig.siret,
    organisme_nda: orgConfig.nda,
    organisme_adresse: orgConfig.adresse,
    organisme_email: orgConfig.email,
    organisme_telephone: orgConfig.telephone,
    organisme_ville: orgConfig.ville,
    qualiopi: orgConfig.qualiopi,
    formation: s.formation.titre,
    formateur_nom: f ? `${f.prenom} ${f.nom}` : "—",
    dates: `${fmt(s.dateDebut)} au ${fmt(s.dateFin)}`,
    date_jour: new Date().toLocaleDateString("fr-FR"),
    cr_conditions: rep.conditions ?? "",
    cr_difficultes: rep.difficultes ?? "",
    cr_besoins: rep.besoins ?? "",
    cr_documentation: rep.documentation ?? "",
    cr_remarques: rep.remarques ?? "",
    cr_rencontreDirection: rep.rencontreDirection ?? "",
  };

  const pub = path.join(process.cwd(), "public");
  const [logoBuf, stampBuf] = await Promise.all([
    fs.readFile(path.join(pub, "cap-competences-logo.png")),
    fs.readFile(path.join(pub, "signature-cap-competences.png")),
  ]);
  const logo64 = `data:image/png;base64,${logoBuf.toString("base64")}`;
  const stamp64 = `data:image/png;base64,${stampBuf.toString("base64")}`;
  const inner = renderTemplate(compteRenduFormateurHtml(), vars)
    .split("/cap-competences-logo.png").join(logo64)
    .split("/signature-cap-competences.png").join(stamp64);

  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" />${DOC_STYLE}</head><body>${inner}</body></html>`;
  const result = (await HTMLtoDOCX(fullHtml, undefined, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false,
  })) as Buffer | ArrayBuffer | Blob;
  let data: Uint8Array;
  if (result instanceof Blob) data = new Uint8Array(await result.arrayBuffer());
  else if (result instanceof ArrayBuffer) data = new Uint8Array(result);
  else data = result as Buffer;

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Compte-rendu-${s.formation.reference}.docx"`,
    },
  });
}
