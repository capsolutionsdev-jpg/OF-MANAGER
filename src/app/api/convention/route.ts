import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { DOCUMENTS, renderTemplate } from "@/lib/documents/templates";
import { htmlToPdf } from "@/lib/pdf";
import { orgConfigFor } from "@/lib/org-identity";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import type { FinancementType } from "@prisma/client";

export const runtime = "nodejs";

const DOC_STYLE = `<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; margin: 0; }
  .doc-header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #0D1B3E; padding-bottom: 8px; margin-bottom: 14px; }
  .doc-logo { height: 54px; width: auto; }
  .doc-org { font-size: 10px; line-height: 1.45; }
  h1, .doc-title { font-size: 17px; text-align: center; color: #0D1B3E; margin: 6px 0 14px; }
  h2 { font-size: 12px; margin: 12px 0 4px; color: #0D1B3E; }
  p, td, th, li { font-size: 11px; line-height: 1.5; }
  table.doc-table { border-collapse: collapse; width: 100%; margin: 6px 0; }
  .doc-table td, .doc-table th { border: 1px solid #999; padding: 4px 7px; text-align: left; vertical-align: top; }
  .doc-signatures { display: flex; gap: 24px; margin-top: 22px; }
  .doc-signatures > div { flex: 1; }
  .sig-label { font-size: 10px; color: #555; margin-bottom: 4px; }
  .sig-box { border: 1px solid #bbb; border-radius: 6px; min-height: 90px; padding: 6px; display: flex; align-items: center; justify-content: center; }
  .doc-stamp { max-height: 80px; max-width: 100%; }
  .doc-footer { font-size: 8px; color: #555; margin-top: 16px; border-top: 1px solid #ccc; padding-top: 6px; }
  .mt { margin-top: 10px; }
  img { max-width: 100%; }
</style>`;

type Candidate = { prenom?: string; nom?: string; tarif?: string };

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Non autorisé.", { status: 401 });
  }

  let body: {
    entrepriseId?: string;
    formation?: string;
    reference?: string;
    certification?: string;
    dateDebut?: string;
    dateFin?: string;
    horaires?: string;
    lieu?: string;
    modalite?: string;
    duree?: string;
    financement?: string;
    candidates?: Candidate[];
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Requête invalide.", { status: 400 });
  }

  const db = await getTenantDb();
  const ent = body.entrepriseId
    ? await db.entreprise.findUnique({ where: { id: body.entrepriseId } })
    : null;

  const candidates = (body.candidates ?? []).filter(
    (c) => (c.prenom ?? "").trim() || (c.nom ?? "").trim(),
  );
  if (candidates.length === 0) {
    return new Response("Aucun candidat renseigné.", { status: 422 });
  }

  const financementLabel = body.financement
    ? FINANCEMENT_LABELS[body.financement as FinancementType] ?? body.financement
    : "—";

  const org = await orgConfigFor(session.user.organismeId);
  const baseVars: Record<string, string> = {
    organisme: org.name,
    organisme_representant: org.representant,
    organisme_qualite: org.representantQualite,
    organisme_siret: org.siret,
    organisme_nda: org.nda,
    organisme_adresse: org.adresse,
    organisme_email: org.email,
    organisme_telephone: org.telephone,
    organisme_ville: org.ville,
    qualiopi: org.qualiopi,
    entreprise_raison_sociale: ent?.raisonSociale ?? "—",
    entreprise_siret: ent?.siret ?? "—",
    entreprise_tva: ent?.numeroTva ?? "—",
    entreprise_adresse:
      [ent?.adresse, ent?.codePostal, ent?.ville].filter(Boolean).join(", ") || "—",
    entreprise_representant: ent?.representant ?? "—",
    entreprise_fonction: ent?.fonction ?? "—",
    entreprise_opco: ent?.opco ? `(${ent.opco})` : "",
    formation: body.formation?.trim() || "—",
    reference_formation: body.reference?.trim() || "—",
    certification: body.certification?.trim() || "—",
    date_debut: body.dateDebut?.trim() || "—",
    date_fin: body.dateFin?.trim() || "—",
    horaires: body.horaires?.trim() || "—",
    duree: body.duree?.trim() || "—",
    lieu: body.lieu?.trim() || "—",
    modalite: body.modalite?.trim() || "—",
    financement: financementLabel,
    date_jour: new Date().toLocaleDateString("fr-FR"),
  };

  // Images de l'organisme en base64
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

  const tpl = DOCUMENTS["CONVENTION_ENTREPRISE"].html;

  const merged = await PDFDocument.create();
  for (const c of candidates) {
    const tarifNum = Number((c.tarif ?? "").replace(",", "."));
    const vars = {
      ...baseVars,
      nom_complet: `${(c.prenom ?? "").trim()} ${(c.nom ?? "").trim()}`.trim(),
      tarif: Number.isFinite(tarifNum) && tarifNum > 0 ? `${tarifNum} € net de taxe` : "—",
    };
    const inner = inline(renderTemplate(tpl, vars));
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />${DOC_STYLE}</head><body>${inner}</body></html>`;
    const bytes = await htmlToPdf(html);
    const src = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }

  const data = await merged.save();
  const nomFichier = `Conventions-${(ent?.raisonSociale ?? "entreprise")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")}.pdf`;

  return new Response(Buffer.from(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}
