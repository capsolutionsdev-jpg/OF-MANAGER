import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getTenantDb } from "@/lib/tenant";
import { DOCUMENTS, EMPTY_IMAGE, STAMP_PLACEHOLDER, renderTemplate } from "@/lib/documents/templates";
import { htmlToPdf } from "@/lib/pdf";
import { orgConfigFor } from "@/lib/org-identity";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { storeUpload } from "@/lib/blob";
import type { FinancementType } from "@prisma/client";

// CSS identique à /api/convention (rendu cohérent avec le bon de convention staff).
const DOC_STYLE = `<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; margin: 0; }
  .doc-header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #221F19; padding-bottom: 8px; margin-bottom: 14px; }
  .doc-logo { height: 54px; width: auto; }
  .doc-org { font-size: 10px; line-height: 1.45; }
  h1, .doc-title { font-size: 17px; text-align: center; color: #221F19; margin: 6px 0 14px; }
  h2 { font-size: 12px; margin: 12px 0 4px; color: #221F19; }
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

const MODALITE_LABEL: Record<string, string> = {
  PRESENTIEL: "Présentiel",
  DISTANCIEL: "Distanciel",
  MIXTE: "Mixte",
};

const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

/**
 * Génère le PDF de la convention de GROUPE (client B2B) à partir d'un
 * `conventionId`, le stocke (Vercel Blob) et met à jour `Convention.fileUrl` +
 * `signatureStatut = ENVOYEE`. Réutilise le template CONVENTION_ENTREPRISE (Qualiopi)
 * et le pipeline htmlToPdf. Renvoie l'URL, ou null si la convention est introuvable.
 */
export async function generateAndStoreConventionPdf(conventionId: string): Promise<string | null> {
  const db = await getTenantDb();
  const conv = await db.convention.findFirst({
    where: { id: conventionId },
    select: {
      id: true,
      organismeId: true,
      montant: true,
      entreprise: {
        select: {
          raisonSociale: true,
          siret: true,
          numeroTva: true,
          adresse: true,
          codePostal: true,
          ville: true,
          representant: true,
          fonction: true,
          opco: true,
        },
      },
      session: {
        select: {
          dateDebut: true,
          dateFin: true,
          horaires: true,
          lieu: true,
          modalite: true,
          formation: { select: { titre: true, reference: true } },
        },
      },
      inscriptions: {
        select: { financementType: true, candidat: { select: { prenom: true, nom: true } } },
      },
    },
  });
  if (!conv) return null;

  // Best-effort : un échec de génération (Chromium indisponible, Blob…) ne doit
  // jamais casser l'action appelante (la convention/les inscriptions sont déjà
  // créées). Le PDF pourra être régénéré depuis la fiche client. On renvoie null.
  try {
    const ent = conv.entreprise;
    const sess = conv.session;
    const org = await orgConfigFor(conv.organismeId);

  const noms = conv.inscriptions
    .map((i) => `${i.candidat.prenom} ${i.candidat.nom}`.trim())
    .filter(Boolean)
    .join(", ");

  const fin = conv.inscriptions.find((i) => i.financementType)?.financementType ?? null;
  const financementLabel = fin ? (FINANCEMENT_LABELS[fin as FinancementType] ?? fin) : "—";

  const montantNum = conv.montant != null ? Number(conv.montant) : 0;
  const tarif = montantNum > 0 ? `${montantNum} € net de taxe` : "—";

  // Durée estimée (jours) à partir des dates de session.
  let duree = "—";
  if (sess?.dateDebut && sess?.dateFin) {
    const jours = Math.max(1, Math.round((sess.dateFin.getTime() - sess.dateDebut.getTime()) / 86_400_000) + 1);
    duree = `${jours} jour${jours > 1 ? "s" : ""}`;
  }

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
    entreprise_raison_sociale: ent?.raisonSociale ?? "—",
    entreprise_siret: ent?.siret ?? "—",
    entreprise_tva: ent?.numeroTva ?? "—",
    entreprise_adresse:
      [ent?.adresse, ent?.codePostal, ent?.ville].filter(Boolean).join(", ") || "—",
    entreprise_representant: ent?.representant ?? "—",
    entreprise_fonction: ent?.fonction ?? "—",
    entreprise_opco: ent?.opco ? `(${ent.opco})` : "",
    formation: sess?.formation.titre ?? "—",
    reference_formation: sess?.formation.reference ?? "—",
    certification: "—",
    nom_complet: noms || "—",
    date_debut: fmtDate(sess?.dateDebut ?? null),
    date_fin: fmtDate(sess?.dateFin ?? null),
    horaires: sess?.horaires ?? "—",
    duree,
    lieu: sess?.lieu ?? "—",
    modalite: sess?.modalite ? (MODALITE_LABEL[sess.modalite] ?? sess.modalite) : "—",
    tarif,
    financement: financementLabel,
    date_jour: new Date().toLocaleDateString("fr-FR"),
  };

  // Logo + cachet du tenant (jamais d'asset de marque — marque blanche).
  const pub = path.join(process.cwd(), "public");
  const logoBuf = await fs.readFile(path.join(pub, "ofmanager-logo.png"));
  const logo64 = org.logoUrl ?? `data:image/png;base64,${logoBuf.toString("base64")}`;
  const stamp64 = org.cachetUrl ?? EMPTY_IMAGE;
  const inline = (html: string) =>
    html.split("/ofmanager-logo.png").join(logo64).split(STAMP_PLACEHOLDER).join(stamp64);

  const inner = inline(renderTemplate(DOCUMENTS["CONVENTION_ENTREPRISE"].html, vars));
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />${DOC_STYLE}</head><body>${inner}</body></html>`;
  const bytes = await htmlToPdf(html);

  const fileUrl = await storeUpload({
    data: bytes,
    folder: `conventions/${conventionId}`,
    ext: "pdf",
    contentType: "application/pdf",
  });

    await db.convention.update({
      where: { id: conventionId },
      data: { fileUrl, signatureStatut: "ENVOYEE" },
    });

    return fileUrl;
  } catch {
    return null;
  }
}
