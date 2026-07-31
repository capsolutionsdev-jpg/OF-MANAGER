import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import {
  DOCUMENTS,
  isDocType,
  renderTemplate,
} from "@/lib/documents/templates";
import { buildVariables } from "@/lib/documents/resolve";
import { isDocAllowedForFormation } from "@/lib/documents/families";
import { orgConfigFor } from "@/lib/org-identity";
import { getDocOverride } from "@/lib/documents/overrides";
import { PrintButton } from "@/components/documents/print-button";
import { SignatureSection } from "@/components/signature/signature-section";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ inscriptionId: string; type: string }>;
}) {
  const { inscriptionId, type } = await params;
  if (!isDocType(type)) notFound();
  const db = await getTenantDb();

  const inscription = await db.inscription.findUnique({
    where: { id: inscriptionId },
    include: { candidat: { include: { entreprise: true } }, session: { include: { formation: true } } },
  });
  if (!inscription) notFound();

  // Garde : refuser un document non pertinent pour la formation de la session
  // (ex. attestation de recyclage SSIAP sur une session SST). Défense en
  // profondeur — le filtre UI masque déjà ces documents.
  if (!isDocAllowedForFormation(type, inscription.session.formation)) notFound();

  const org = await orgConfigFor(inscription.organismeId);
  const vars = buildVariables(inscription, org);
  const html = renderTemplate(DOCUMENTS[type].html, vars)
    .split("/cap-competences-logo.png")
    .join(org.logoUrl ?? "/cap-competences-logo.png")
    .split("/signature-cap-competences.png")
    .join(org.cachetUrl ?? "/signature-cap-competences.png");

  // Document fourni par l'OF (remplace notre modèle pour les docs réglementaires)
  const override = getDocOverride(org.documentsConfig, type);

  return (
    <div className="min-h-screen bg-muted/40 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-4 space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <Link
              href={`/sessions/${inscription.sessionId}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Retour à la session
            </Link>
            <PrintButton />
          </div>
          <div className="rounded-lg border bg-card p-3">
            <SignatureSection
              inscriptionId={inscriptionId}
              type={type}
              label={DOCUMENTS[type].label}
            />
          </div>
        </div>
        {override.mode === "client" && override.fileUrl ? (
          override.fileUrl.startsWith("data:application/pdf") ? (
            <iframe
              src={override.fileUrl}
              title={DOCUMENTS[type].label}
              className="doc-page mx-auto h-[1100px] w-full bg-white shadow-sm"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={override.fileUrl}
              alt={DOCUMENTS[type].label}
              className="doc-page mx-auto block bg-white shadow-sm"
            />
          )
        ) : (
          <article
            className="doc-page mx-auto bg-white p-12 text-black shadow-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      <style>{`
        .doc-header { display:flex; justify-content:space-between; gap:16px; font-size:12px; color:#333; border-bottom:2px solid #111; padding-bottom:12px; margin-bottom:24px; }
        .doc-title { font-size:20px; font-weight:700; text-align:center; margin:0 0 24px; }
        .doc-page h2 { font-size:14px; font-weight:700; margin:18px 0 6px; }
        .doc-page p { font-size:13px; line-height:1.6; margin:8px 0; }
        .doc-table { width:100%; border-collapse:collapse; margin:12px 0; font-size:13px; }
        .doc-table td { border:1px solid #ccc; padding:6px 10px; }
        .doc-table td:first-child { width:35%; background:#f5f5f5; font-weight:600; }
        .doc-signatures { display:flex; justify-content:space-between; gap:24px; margin-top:40px; }
        .doc-signatures > div { flex:1; }
        .sig-label { font-size:12px; margin-bottom:6px; }
        .sig-box { height:80px; border:1px dashed #aaa; border-radius:6px; }
        .doc-footer { margin-top:32px; padding-top:12px; border-top:1px solid #ddd; font-size:10px; color:#777; text-align:center; }
        .doc-header { align-items:center; }
        .doc-logo { height:48px; width:auto; }
        .doc-page .mt { margin-top:14px; }
        .rate { width:100%; border-collapse:collapse; margin:12px 0; font-size:12px; }
        .rate th, .rate td { border:1px solid #ccc; padding:5px 8px; text-align:center; }
        .rate th:first-child, .rate td:first-child { text-align:left; width:46%; }
        .rate th { background:#f5f5f5; font-weight:600; font-size:11px; }
        .rate .grp td { background:#eaeefb; font-weight:700; text-align:left; }
        .doc-table td[colspan] { font-weight:400; }
        .fill { border-bottom:1px dotted #999; height:20px; margin:6px 0; }
        .fillcell { min-width:200px; }
        .sig-box.half { height:60px; max-width:320px; }
        .doc-stamp { display:block; max-height:120px; max-width:260px; margin-top:4px; }
        .org-stamp-block { margin-top:28px; max-width:320px; }
        .org-stamp-block .sig-label { margin-bottom:4px; }
        @media print {
          body { background:white; }
          .doc-page { box-shadow:none; padding:0; max-width:none; }
        }
      `}</style>
    </div>
  );
}
