import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { nbJoursFormateur, parseAnimation } from "@/lib/formateurs/animation";
import {
  DOCUMENTS,
  EMPTY_IMAGE,
  STAMP_PLACEHOLDER,
  renderTemplate,
  compteRenduFormateurHtml,
  contratFormateurHtml,
} from "@/lib/documents/templates";
import { MODALITE_LABELS } from "@/lib/validators/formation";
import { SATISFACTION_CRITERES, SATISFACTION_NOTES } from "@/lib/satisfaction";
import { buildVariables } from "@/lib/documents/resolve";
import { escapeHtml } from "@/lib/documents/escape";
import { orgConfigFor } from "@/lib/org-identity";
import {
  signatureRef,
  signatureMentionHtml,
} from "@/lib/documents/signature-proof";
import { buildCertificatPdf } from "@/lib/documents/certificat-signature";
import { htmlToPdf, htmlToPdfMany } from "@/lib/pdf";
import { docContextFromInscription, isDocApplicable, PRESIGN_DOC_TYPES } from "@/lib/documents/families";

// Types de documents à signer par le candidat
export const SIGNED_DOC_TYPES = [
  "FICHE_INSCRIPTION",
  "CONTRAT_FORMATION",
  "CONVENTION_FORMATION",
  "REGLEMENT_INTERIEUR",
];

const DOC_STYLE = `<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; margin: 0; }
  .doc-header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #221F19; padding-bottom: 8px; margin-bottom: 14px; }
  .doc-logo { height: 54px; width: auto; }
  .doc-org { font-size: 10px; line-height: 1.45; }
  h1, .doc-title { font-size: 17px; text-align: center; color: #221F19; margin: 6px 0 14px; }
  h2 { font-size: 12px; margin: 12px 0 4px; color: #221F19; }
  p, td, th, li { font-size: 11px; line-height: 1.5; }
  table.doc-table, table.rate { border-collapse: collapse; width: 100%; margin: 6px 0; }
  .doc-table td, .doc-table th { border: 1px solid #999; padding: 4px 7px; text-align: left; vertical-align: top; }
  .rate td, .rate th { border: 1px solid #999; padding: 4px; text-align: center; }
  .doc-signatures { display: flex; gap: 24px; margin-top: 22px; }
  .doc-signatures > div { flex: 1; }
  .sig-label { font-size: 10px; color: #555; margin-bottom: 4px; }
  .sig-box { border: 1px solid #bbb; border-radius: 6px; min-height: 90px; padding: 6px; display: flex; align-items: center; justify-content: center; }
  .sig-box.half { min-height: 60px; }
  .doc-stamp { max-height: 80px; max-width: 100%; }
  .org-stamp-block { margin-top: 18px; }
  .doc-footer { font-size: 8px; color: #555; margin-top: 16px; border-top: 1px solid #ccc; padding-top: 6px; }
  .fill { border-bottom: 1px solid #999; height: 18px; margin: 6px 0; }
  .mt { margin-top: 10px; }
  img { max-width: 100%; }
</style>`;

export type PdfResult = { data: Uint8Array; filename: string } | null;

/** Nombre de jours OUVRÉS (lun→ven) entre deux dates, bornes incluses. */
function businessDaysBetween(debut: Date, fin: Date): number {
  const d = new Date(debut);
  d.setHours(0, 0, 0, 0);
  const end = new Date(fin);
  end.setHours(0, 0, 0, 0);
  let n = 0;
  while (d <= end) {
    const jour = d.getDay(); // 0 = dimanche, 6 = samedi
    if (jour !== 0 && jour !== 6) n++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(1, n);
}

function safeName(s: string) {
  return (s || "candidat")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-");
}

/**
 * Assemble en UN SEUL PDF les documents d'une inscription (avec signature
 * manuscrite intégrée si signé + certificat de preuve).
 */
export async function buildInscriptionPdf(
  inscriptionId: string,
  opts?: {
    only?: string[];
    includeCertificat?: boolean;
    signedOnly?: boolean;
    /** Sous-ensemble « à consulter avant signature » (cf. PRESIGN_DOC_TYPES). */
    presignOnly?: boolean;
  },
): Promise<PdfResult> {
  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { candidat: { include: { entreprise: true } }, session: { include: { formation: true, salle: true } } },
  });
  if (!inscription) return null;

  const org = await orgConfigFor(inscription.organismeId);
  const vars = buildVariables(inscription, org);

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

  vars.signature_stagiaire =
    signed && inscription.signatureDataUrl
      ? `<img src="${inscription.signatureDataUrl}" alt="Signature du stagiaire" style="max-height:70px" />`
      : "";

  const mention = signed
    ? signatureMentionHtml({
        nom: signed.nom,
        signedAt: signed.at,
        ip: signed.ip,
        ref: signed.ref,
      })
    : "";

  // Images en base64
  // Logo = UNIQUEMENT celui du tenant (org.logoUrl). Jamais de repli sur l'asset
  // CAP : sinon un autre organisme afficherait le logo CAP sur ses documents
  // (même règle que le cachet). Le tenant CAP porte son logo dans org.logoUrl.
  const logo64 = org.logoUrl ?? EMPTY_IMAGE;
  // Cachet/signature = UNIQUEMENT celui du tenant (org.cachetUrl). Jamais de repli
  // sur l'asset CAP : sinon un autre organisme afficherait le tampon CAP sur ses
  // documents. Vide tant que le tenant ne l'a pas chargé (console superadmin).
  const stamp64 = org.cachetUrl ?? EMPTY_IMAGE;
  const inlineImages = (html: string) =>
    html
      .split("/ofmanager-logo.png").join(logo64)
      .split(STAMP_PLACEHOLDER).join(stamp64);

  // Sélection des documents :
  //  - signedOnly : le sous-ensemble « documents à signer » (fiche, règlement,
  //    et contrat XOR convention selon le profil) RESTREINT à ce qui est
  //    APPLICABLE — c'est ici que se joue la règle particulier→contrat /
  //    professionnel→convention (cf. #10) ;
  //  - only : une liste explicite (génération d'UN document précis, staff) ;
  //  - sinon : l'ensemble APPLICABLE à cette inscription.
  const ctx = docContextFromInscription(inscription);
  const entries = Object.entries(DOCUMENTS).filter(([type]) =>
    opts?.presignOnly
      ? PRESIGN_DOC_TYPES.includes(type) && isDocApplicable(type, ctx)
      : opts?.signedOnly
        ? SIGNED_DOC_TYPES.includes(type) && isDocApplicable(type, ctx)
        : opts?.only
          ? opts.only.includes(type)
          : isDocApplicable(type, ctx),
  );

  const htmls = entries.map(([, doc]) => {
    const inner = inlineImages(renderTemplate(doc.html, vars)) + mention;
    return `<!DOCTYPE html><html><head><meta charset="utf-8" />${DOC_STYLE}</head><body>${inner}</body></html>`;
  });

  const pdfBytesList = await htmlToPdfMany(htmls);

  const merged = await PDFDocument.create();
  for (const bytes of pdfBytesList) {
    const src = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }

  // Certificat de signature électronique (preuve) en dernière page
  if ((opts?.includeCertificat ?? true) && signed) {
    const certif = await buildCertificatPdf({
      candidatNom: signed.nom,
      candidatEmail: inscription.candidat.email,
      formation: inscription.session.formation.titre,
      // Liste RÉELLE des documents signés inclus (le certificat de preuve ne doit
      // pas annoncer un document non joint — ex. convention absente pour un
      // particulier). Cf. #10.
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
    const src = await PDFDocument.load(certif);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }

  const data = new Uint8Array(await merged.save());
  return { data, filename: `Dossier-inscription-${safeName(vars.nom_complet)}.pdf` };
}

/** Génère un document unique (ex. convocation) en PDF. */
export async function buildSingleDocPdf(
  inscriptionId: string,
  type: string,
): Promise<PdfResult> {
  return buildInscriptionPdf(inscriptionId, {
    only: [type],
    includeCertificat: false,
  });
}

// Échappement HTML mutualisé (couvre aussi " et ') — cf. §26.
const esc = escapeHtml;

/** Génère la fiche de satisfaction remplie + signature du stagiaire, en PDF. */
export async function buildSatisfactionPdf(
  inscriptionId: string,
): Promise<PdfResult> {
  const i = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { candidat: { include: { entreprise: true } }, session: { include: { formation: true, salle: true } } },
  });
  if (!i) return null;

  const org = await orgConfigFor(i.organismeId);
  const rep = (i.satisfactionJson ?? {}) as {
    notes?: Record<string, number>;
    recommander?: number;
    commentaire?: string;
    __signature?: string;
  };
  const notes = rep.notes ?? {};
  const fmtD = (d: Date) => d.toLocaleDateString("fr-FR");
  const rows = SATISFACTION_CRITERES.map((c) => {
    const v = notes[c.key];
    const label = SATISFACTION_NOTES.find((n) => n.value === v)?.label ?? "—";
    return `<tr><td>${c.label}</td><td>${label}</td></tr>`;
  }).join("");

  const sig = rep.__signature
    ? `<img src="${rep.__signature}" alt="Signature" style="max-height:70px" />`
    : "";

  const inner = `
    <div class="doc-header">
      ${org.logoUrl ? `<img src="${org.logoUrl}" alt="${org.name}" class="doc-logo" />` : `<strong style="font-size:16px">${org.name}</strong>`}
      <div class="doc-org"><strong>${org.name}</strong> — ${org.qualiopi}<br/>
      ${org.adresse}<br/>SIRET ${org.siret} · NDA ${org.nda}</div>
    </div>
    <h1 class="doc-title">Enquête de satisfaction — stagiaire</h1>
    <table class="doc-table">
      <tr><td>Stagiaire</td><td>${esc(i.candidat.prenom)} ${esc(i.candidat.nom)}</td></tr>
      <tr><td>Formation</td><td>${esc(i.session.formation.titre)}</td></tr>
      <tr><td>Dates</td><td>du ${fmtD(i.session.dateDebut)} au ${fmtD(i.session.dateFin)}</td></tr>
    </table>
    <table class="doc-table"><tr><th>Critère</th><th>Appréciation</th></tr>${rows}</table>
    <p class="mt"><strong>Recommanderiez-vous cette formation ? (0–10) :</strong> ${rep.recommander ?? "—"}</p>
    <h2>Commentaires / suggestions</h2>
    <p>${rep.commentaire ? esc(rep.commentaire) : "—"}</p>
    <p class="mt">Fait le ${new Date().toLocaleDateString("fr-FR")}.</p>
    <div class="doc-signatures">
      <div><div class="sig-label">Signature du stagiaire — ${esc(i.candidat.prenom)} ${esc(i.candidat.nom)}</div><div class="sig-box">${sig}</div></div>
      <div><div class="sig-label">Cachet de l'organisme</div><div class="sig-box"><img src="${STAMP_PLACEHOLDER}" class="doc-stamp" alt="Cachet" /></div></div>
    </div>`;

  // Logo = UNIQUEMENT celui du tenant (org.logoUrl). Jamais de repli sur l'asset
  // CAP : sinon un autre organisme afficherait le logo CAP sur ses documents
  // (même règle que le cachet). Le tenant CAP porte son logo dans org.logoUrl.
  const logo64 = org.logoUrl ?? EMPTY_IMAGE;
  // Cachet/signature = UNIQUEMENT celui du tenant (org.cachetUrl). Jamais de repli
  // sur l'asset CAP : sinon un autre organisme afficherait le tampon CAP sur ses
  // documents. Vide tant que le tenant ne l'a pas chargé (console superadmin).
  const stamp64 = org.cachetUrl ?? EMPTY_IMAGE;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />${DOC_STYLE}</head><body>${inner}</body></html>`
    .split("/ofmanager-logo.png").join(logo64)
    .split(STAMP_PLACEHOLDER).join(stamp64);

  const data = await htmlToPdf(html);
  return {
    data,
    filename: `Satisfaction-${safeName(`${i.candidat.prenom}-${i.candidat.nom}`)}.pdf`,
  };
}

/** Génère le contrat de sous-traitance du formateur en PDF (tarif/jour, cachet, signature). */
export async function buildContratFormateurPdf(
  sessionId: string,
): Promise<PdfResult> {
  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { formation: true, formateurs: true, seances: { select: { date: true } } },
  });
  if (!s) return null;
  const f = s.formateurs[0];
  if (!f) return null;
  // Formateur INTERNE (salarié de l'école) → aucun contrat de sous-traitance à
  // générer (D2). Garde à la SOURCE : couvre toutes les routes (bouton, lien de
  // signature) et pas seulement l'envoi.
  if (f.typeContrat === "INTERNE") return null;

  const fmtD = (d: Date) => d.toLocaleDateString("fr-FR");
  // Nombre de jours facturés au formateur, par ordre de fiabilité :
  //  1) durée de la formation (dureeJours) = source de vérité ;
  //  2) sinon nombre de JOURS DISTINCTS réellement planifiés (séances) — gère les
  //     sessions non-contiguës (ex. 1 j/semaine) sans surcompter ;
  //  3) en dernier repli, jours ouvrés entre les dates (sans week-ends).
  const joursSeances = new Set(
    s.seances.map((x) => x.date.toISOString().slice(0, 10)),
  ).size;
  const nbJoursTotal =
    s.formation.dureeJours ??
    (joursSeances > 0 ? joursSeances : businessDaysBetween(s.dateDebut, s.dateFin));
  // Animation partielle : ne facturer que les jours réellement couverts par CE formateur.
  const nbJours = nbJoursFormateur(parseAnimation(s.formateursAnimation), f.id, nbJoursTotal);

  const tarif =
    s.tarifFormateurJour != null
      ? Number(s.tarifFormateurJour)
      : f.tarifJournalier != null
        ? Number(f.tarifJournalier)
        : null;
  const total = tarif != null ? tarif * nbJours : null;
  const euro = (n: number) => `${n.toLocaleString("fr-FR")} € HT`;

  const coords = [f.adresse, f.siret ? `SIRET ${f.siret}` : null]
    .filter(Boolean)
    .join(" — ");

  const org = await orgConfigFor(s.organismeId);
  const vars: Record<string, string> = {
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
    formation: s.formation.titre,
    reference_formation: s.formation.reference,
    date_debut: fmtD(s.dateDebut),
    date_fin: fmtD(s.dateFin),
    duree: s.formation.duree ?? (s.formation.dureeHeures ? `${s.formation.dureeHeures}h` : "—"),
    nb_jours: String(nbJours),
    lieu: s.lieu ?? "—",
    modalite: MODALITE_LABELS[s.modalite],
    date_jour: new Date().toLocaleDateString("fr-FR"),
    formateur_nom: `${f.prenom} ${f.nom}`,
    formateur_coords: coords ? `, ${coords}` : "",
    prix_jour: tarif != null ? euro(tarif) : "____________",
    total: total != null ? euro(total) : "____________",
    signature_formateur: s.contratFormateurSignatureUrl
      ? `<img src="${s.contratFormateurSignatureUrl}" alt="Signature du formateur" style="max-height:70px" />`
      : "",
  };

  // Logo = UNIQUEMENT celui du tenant (org.logoUrl). Jamais de repli sur l'asset
  // CAP : sinon un autre organisme afficherait le logo CAP sur ses documents
  // (même règle que le cachet). Le tenant CAP porte son logo dans org.logoUrl.
  const logo64 = org.logoUrl ?? EMPTY_IMAGE;
  // Cachet/signature = UNIQUEMENT celui du tenant (org.cachetUrl). Jamais de repli
  // sur l'asset CAP : sinon un autre organisme afficherait le tampon CAP sur ses
  // documents. Vide tant que le tenant ne l'a pas chargé (console superadmin).
  const stamp64 = org.cachetUrl ?? EMPTY_IMAGE;
  const inner = renderTemplate(contratFormateurHtml(), vars)
    .split("/ofmanager-logo.png").join(logo64)
    .split(STAMP_PLACEHOLDER).join(stamp64);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />${DOC_STYLE}</head><body>${inner}</body></html>`;
  const data = await htmlToPdf(html);
  return {
    data,
    filename: `Contrat-formateur-${safeName(`${f.prenom}-${f.nom}`)}.pdf`,
  };
}

/** Génère le compte-rendu pédagogique du formateur en PDF (avec sa signature). */
export async function buildCompteRenduPdf(
  sessionId: string,
): Promise<PdfResult> {
  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { formation: true, formateurs: true },
  });
  if (!s) return null;

  const fmtD = (d: Date) => d.toLocaleDateString("fr-FR");
  const f = s.formateurs[0];
  const rep = (s.crFormateurJson ?? {}) as Record<string, string>;
  const signature = rep.__signature ?? "";

  const org = await orgConfigFor(s.organismeId);
  const vars: Record<string, string> = {
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
    formation: s.formation.titre,
    formateur_nom: f ? `${f.prenom} ${f.nom}` : "—",
    dates: `${fmtD(s.dateDebut)} au ${fmtD(s.dateFin)}`,
    date_jour: new Date().toLocaleDateString("fr-FR"),
    cr_conditions: rep.conditions ?? "",
    cr_difficultes: rep.difficultes ?? "",
    cr_besoins: rep.besoins ?? "",
    cr_documentation: rep.documentation ?? "",
    cr_remarques: rep.remarques ?? "",
    cr_rencontreDirection: rep.rencontreDirection ?? "",
    signature_formateur: signature
      ? `<img src="${signature}" alt="Signature du formateur" style="max-height:70px" />`
      : "",
  };

  // Logo = UNIQUEMENT celui du tenant (org.logoUrl). Jamais de repli sur l'asset
  // CAP : sinon un autre organisme afficherait le logo CAP sur ses documents
  // (même règle que le cachet). Le tenant CAP porte son logo dans org.logoUrl.
  const logo64 = org.logoUrl ?? EMPTY_IMAGE;
  // Cachet/signature = UNIQUEMENT celui du tenant (org.cachetUrl). Jamais de repli
  // sur l'asset CAP : sinon un autre organisme afficherait le tampon CAP sur ses
  // documents. Vide tant que le tenant ne l'a pas chargé (console superadmin).
  const stamp64 = org.cachetUrl ?? EMPTY_IMAGE;
  const inner = renderTemplate(compteRenduFormateurHtml(), vars)
    .split("/ofmanager-logo.png").join(logo64)
    .split(STAMP_PLACEHOLDER).join(stamp64);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />${DOC_STYLE}</head><body>${inner}</body></html>`;
  const data = await htmlToPdf(html);
  return {
    data,
    filename: `Compte-rendu-${safeName(s.formation.reference)}.pdf`,
  };
}
