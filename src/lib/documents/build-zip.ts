import { promises as fs } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import HTMLtoDOCX from "@turbodocx/html-to-docx";
import { prisma } from "@/lib/prisma";
import { DOCUMENTS, EMPTY_IMAGE, STAMP_PLACEHOLDER, renderTemplate } from "@/lib/documents/templates";
import { buildVariables } from "@/lib/documents/resolve";
import { assiduiteFromSession } from "@/lib/assiduite";
import { dateJourPourDoc } from "@/lib/documents/doc-dates";
import { docContextFromInscription, isDocApplicable } from "@/lib/documents/families";
import { orgConfigFor } from "@/lib/org-identity";
import {
  signatureRef,
  signatureMentionHtml,
} from "@/lib/documents/signature-proof";
import { buildCertificatPdf } from "@/lib/documents/certificat-signature";
import { SIGNED_DOC_TYPES } from "@/lib/documents/build-pdf";

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

/** Enlève accents + caractères non-alphanumériques (noms de fichiers ZIP sûrs). */
export function safeSegment(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Nom de dossier lisible (garde espaces/accents, retire seulement les séparateurs de chemin). */
export function safeFolderName(s: string): string {
  return (s || "Candidat").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "Candidat";
}

/**
 * Ajoute le dossier documentaire d'UNE inscription dans un ZIP (dossier passé en
 * `parent`) : un sous-dossier par candidat contenant tous ses documents applicables
 * (.docx) + le certificat de signature électronique si l'inscription est signée.
 *
 * Réutilisable : `buildInscriptionDocsZip` (dossier candidat seul) ET
 * `buildSessionDossierZip` (un dossier candidat par participant de la session).
 *
 * `opts.folderName(nomComplet, safe)` personnalise le nom du sous-dossier
 * (défaut : `Documents-<safe>`). Renvoie le `safe` du candidat, ou null si l'inscription
 * est introuvable.
 */
export async function addInscriptionDossier(
  parent: JSZip,
  inscriptionId: string,
  opts?: { only?: string[]; folderName?: (nomComplet: string, safe: string) => string },
): Promise<string | null> {
  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: {
      candidat: { include: { entreprise: true } },
      session: {
        include: {
          formation: true,
          salle: true,
          seances: { select: { type: true, presences: { select: { statut: true, apprenantId: true } } } },
        },
      },
    },
  });
  if (!inscription) return null;

  const org = await orgConfigFor(inscription.organismeId);
  const assiduite = assiduiteFromSession(
    inscription.session.seances,
    inscription.apprenantId,
    inscription.session.formation.dureeHeures,
  );
  const vars = buildVariables(inscription, org, assiduite);

  const nomComplet =
    vars.nom_complet || `${inscription.candidat.prenom} ${inscription.candidat.nom}`;
  const safe = safeSegment(nomComplet) || "candidat";

  // Preuve de signature (si l'inscription est signée)
  const signed = inscription.signedAt
    ? {
        at: inscription.signedAt,
        ip: inscription.signatureIp,
        ref: signatureRef(inscription.id, inscription.signedAt),
        nom: nomComplet,
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
  const logoBuf = await fs.readFile(path.join(pub, "ofmanager-logo.png"));
  const logo64 = org.logoUrl ?? `data:image/png;base64,${logoBuf.toString("base64")}`;
  // Cachet/signature = UNIQUEMENT celui du tenant. Jamais d'asset de marque (marque blanche).
  const stamp64 = org.cachetUrl ?? EMPTY_IMAGE;
  const inlineImages = (html: string) =>
    html
      .split("/ofmanager-logo.png").join(logo64)
      .split(STAMP_PLACEHOLDER).join(stamp64);

  const folderName = opts?.folderName ? opts.folderName(nomComplet, safe) : `Documents-${safe}`;
  const folder = parent.folder(safeFolderName(folderName)) ?? parent;

  // Documents applicables à cette inscription (particulier/entreprise, examen,
  // financement…) — plus de génération en vrac de tout le catalogue.
  const ctx = docContextFromInscription(inscription);
  const entries = Object.entries(DOCUMENTS).filter(([type]) =>
    opts?.only ? opts.only.includes(type) : isDocApplicable(type, ctx),
  );

  for (const [type, doc] of entries) {
    // Date « Fait le » propre au type de document (chronologie de la formation).
    const dj = dateJourPourDoc(type, inscription.session);
    const v = dj ? { ...vars, date_jour: dj } : vars;
    const inner = inlineImages(renderTemplate(doc.html, v)) + mention;
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
      // Liste réelle des documents signés inclus (contrat XOR convention selon le
      // profil) — cohérent avec le PDF fusionné, cf. #10.
      documents: entries
        .filter(([type]) => SIGNED_DOC_TYPES.includes(type))
        .map(([, doc]) => doc.label),
      signataire: signed.nom,
      signedAt: signed.at,
      ip: signed.ip,
      ref: signed.ref,
      signatureDataUrl: inscription.signatureDataUrl,
      org: { name: org.name, adresse: org.adresse, siret: org.siret, nda: org.nda },
    });
    folder.file("Certificat-de-signature-electronique.pdf", certif);
  }

  return safe;
}

/**
 * Génère le ZIP de tous les documents d'une inscription.
 * `only` permet de limiter à certains types (ex. ["FICHE_INSCRIPTION", ...]).
 */
export async function buildInscriptionDocsZip(
  inscriptionId: string,
  only?: string[],
): Promise<ZipResult> {
  const zip = new JSZip();
  const safe = await addInscriptionDossier(zip, inscriptionId, { only });
  if (!safe) return null;
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return {
    data: new Uint8Array(zipBuffer),
    filename: `documents-${safe}.zip`,
  };
}
