import { promises as fs } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import HTMLtoDOCX from "@turbodocx/html-to-docx";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { contratFormateurHtml, renderTemplate } from "@/lib/documents/templates";
import { orgConfig } from "@/lib/org-config";
import { MODALITE_LABELS } from "@/lib/validators/formation";

export const runtime = "nodejs";

const DOC_STYLE = `<style>
  h1 { font-size: 18pt; text-align: center; margin-bottom: 16pt; }
  h2 { font-size: 12pt; margin: 12pt 0 4pt; }
  p, td, th, li { font-size: 10pt; line-height: 1.5; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  td, th { border: 1px solid #888; padding: 4px 6px; }
  .doc-footer { font-size: 8pt; color: #555; margin-top: 16pt; }
</style>`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { sessionId } = await params;
  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { formation: true, formateurs: true },
  });
  if (!s) return new Response("Session introuvable", { status: 404 });
  if (s.formateurs.length === 0)
    return new Response(
      "Aucun formateur affecté à cette session. Affectez un formateur depuis la fiche session.",
      { status: 400 },
    );

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const msPerDay = 1000 * 60 * 60 * 24;
  const nbJours =
    Math.round((s.dateFin.getTime() - s.dateDebut.getTime()) / msPerDay) + 1;

  // Variables communes (organisme + session)
  const baseVars: Record<string, string> = {
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
    reference_formation: s.formation.reference,
    session_reference: s.reference ?? "—",
    date_debut: fmt(s.dateDebut),
    date_fin: fmt(s.dateFin),
    duree: s.formation.duree ?? (s.formation.dureeHeures ? `${s.formation.dureeHeures}h` : "—"),
    nb_jours: String(nbJours),
    lieu: s.lieu ?? "—",
    modalite: MODALITE_LABELS[s.modalite],
    date_jour: new Date().toLocaleDateString("fr-FR"),
  };

  // Images base64 (html-to-docx ne charge pas les URL)
  const pub = path.join(process.cwd(), "public");
  const [logoBuf, stampBuf] = await Promise.all([
    fs.readFile(path.join(pub, "cap-competences-logo.png")),
    fs.readFile(path.join(pub, "signature-cap-competences.png")),
  ]);
  const logo64 = `data:image/png;base64,${logoBuf.toString("base64")}`;
  const stamp64 = `data:image/png;base64,${stampBuf.toString("base64")}`;
  const inline = (html: string) =>
    html
      .split("/cap-competences-logo.png").join(logo64)
      .split("/signature-cap-competences.png").join(stamp64);

  const template = contratFormateurHtml();

  async function buildDocx(formateurNom: string, contact: string) {
    const vars = {
      ...baseVars,
      formateur_nom: formateurNom,
      formateur_contact: contact,
    };
    const inner = inline(renderTemplate(template, vars));
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" />${DOC_STYLE}</head><body>${inner}</body></html>`;
    const result = (await HTMLtoDOCX(fullHtml, undefined, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
    })) as Buffer | ArrayBuffer | Blob;
    if (result instanceof Blob) return new Uint8Array(await result.arrayBuffer());
    if (result instanceof ArrayBuffer) return new Uint8Array(result);
    return result as Buffer;
  }

  const safe = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-");

  // Un seul formateur → docx direct ; plusieurs → zip
  if (s.formateurs.length === 1) {
    const f = s.formateurs[0];
    const contact = [f.email, f.telephone].filter(Boolean).join(" · ");
    const data = await buildDocx(
      `${f.prenom} ${f.nom}`,
      contact ? ` (${contact})` : "",
    );
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Contrat-formateur-${safe(f.prenom + "-" + f.nom)}.docx"`,
      },
    });
  }

  const zip = new JSZip();
  for (const f of s.formateurs) {
    const contact = [f.email, f.telephone].filter(Boolean).join(" · ");
    const data = await buildDocx(
      `${f.prenom} ${f.nom}`,
      contact ? ` (${contact})` : "",
    );
    zip.file(`Contrat-formateur-${safe(f.prenom + "-" + f.nom)}.docx`, data);
  }
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="contrats-formateurs-${safe(s.formation.titre)}.zip"`,
    },
  });
}
