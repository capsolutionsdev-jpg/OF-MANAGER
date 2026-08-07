import { promises as fs } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import HTMLtoDOCX from "@turbodocx/html-to-docx";
import { prisma } from "@/lib/prisma";
import { DOCUMENTS, EMPTY_IMAGE, renderTemplate } from "@/lib/documents/templates";
import { buildVariables } from "@/lib/documents/resolve";
import { docContextFromInscription, isDocApplicable } from "@/lib/documents/families";
import { orgConfigFor } from "@/lib/org-identity";
import {
  signatureRef,
  signatureMentionHtml,
} from "@/lib/documents/signature-proof";
import { buildCertificatPdf } from "@/lib/documents/certificat-signature";

// Documents soumis à la signature du stagiaire (pour le certificat de preuve)
const SIGNED_DOC_LABELS = [
  "Fiche d'inscription",
  "Contrat de formation",
  "Convention de formation",
  "Règlement intérieur",
];

const DOC_STYLE = `<style>
  h1 { font-size: 18pt; text-align: center; margin-bottom: 16pt; }
  h2 { font-size: 12pt; margin: 12pt 0 4pt; }
  p, td, th, li { font-size: 10pt; line-height: 1.5; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  td, th { border: 1px solid #888; padding: 4px 6px; }
  .doc-footer { font-size: 8pt; color: #555; margin-top: 16pt; }
</style>`;

export type ZipResult = {
  data: Uint8Array;
  filename: string;
} | null;

/**
 * Génère le ZIP de tous les documents d'une inscription.
 * `only` permet de limiter à certains types (ex. ["FICHE_INSCRIPTION", ...]).
 */
export async function buildInscriptionDocsZip(
  inscriptionId: string,
  only?: string[],
): Promise<ZipResult> {
  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { candidat: { include: { entreprise: true } }, session: { include: { formation: true } } },
  });
  if (!inscription) return null;

  const org = await orgConfigFor(inscription.organismeId);
  const vars = buildVariables(inscription, org);

  // Preuve de signature (si l'inscription est signée)
  const signed = inscription.signedAt
    ? {
        at: inscription.signedAt,
        ip: inscription.signatureIp,
        ref: signatureRef(inscription.id, inscription.signedAt),
        nom:
          vars.nom_complet ||
          `${inscription.candidat.prenom} ${inscription.candidat.nom}`,
      }
    : null;
  const mention = signed
    ? signatureMentionHtml({
        nom: signed.nom,
        signedAt: signed.at,
        ip: signed.ip,
        ref: signed.ref,
      })
    : "";

  // Image de la signature manuscrite insérée dans la case « stagiaire » des docs
  vars.signature_stagiaire =
    signed && inscription.signatureDataUrl
      ? `<img src="${inscription.signatureDataUrl}" alt="Signature du stagiaire" style="max-height:70px" />`
      : "";

  // Images encodées en base64 (html-to-docx ne charge pas les URL).
  const pub = path.join(process.cwd(), "public");
  const logoBuf = await fs.readFile(path.join(pub, "cap-competences-logo.png"));
  const logo64 = org.logoUrl ?? `data:image/png;base64,${logoBuf.toString("base64")}`;
  // Cachet/signature = UNIQUEMENT celui du tenant. Jamais l'asset CAP (marque blanche).
  const stamp64 = org.cachetUrl ?? EMPTY_IMAGE;
  const inlineImages = (html: string) =>
    html
      .split("/cap-competences-logo.png").join(logo64)
      .split("/signature-cap-competences.png").join(stamp64);

  const zip = new JSZip();
  const safeName = (vars.nom_complet || "candidat")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-");
  const folder = zip.folder(`Documents-${safeName}`) ?? zip;

  // Documents applicables à cette inscription (particulier/entreprise, examen,
  // financement…) — plus de génération en vrac de tout le catalogue.
  const ctx = docContextFromInscription(inscription);
  const entries = Object.entries(DOCUMENTS).filter(([type]) =>
    only ? only.includes(type) : isDocApplicable(type, ctx),
  );

  for (const [, doc] of entries) {
    const inner = inlineImages(renderTemplate(doc.html, vars)) + mention;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" />${DOC_STYLE}</head><body>${inner}</body></html>`;
    const result = (await HTMLtoDOCX(fullHtml, undefined, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
    })) as Buffer | ArrayBuffer | Blob;

    let data: Buffer | Uint8Array;
    if (result instanceof Blob) data = new Uint8Array(await result.arrayBuffer());
    else if (result instanceof ArrayBuffer) data = new Uint8Array(result);
    else data = result;

    folder.file(`${doc.label}.docx`, data);
  }

  // Certificat de signature électronique (preuve / piste d'audit)
  if (signed) {
    const certif = await buildCertificatPdf({
      candidatNom: signed.nom,
      candidatEmail: inscription.candidat.email,
      formation: inscription.session.formation.titre,
      documents: SIGNED_DOC_LABELS,
      signataire: signed.nom,
      signedAt: signed.at,
      ip: signed.ip,
      ref: signed.ref,
      signatureDataUrl: inscription.signatureDataUrl,
      org: { name: org.name, adresse: org.adresse, siret: org.siret, nda: org.nda },
    });
    folder.file("Certificat-de-signature-electronique.pdf", certif);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return {
    data: new Uint8Array(zipBuffer),
    filename: `documents-${safeName}.zip`,
  };
}
