// src/lib/factures/proforma-pdf.tsx
// Document PDF « FACTURE PROFORMA » — HTML auto-suffisant → moteur Chromium (htmlToPdf).
// OFMANAGER pré-remplit : la proforma prépare la facturation, elle NE constitue PAS
// une facture et ne donne pas lieu à paiement définitif. Réutilise l'identité de l'OF
// (orgConfigFor) et la mention d'exonération portée par la cible.
import { htmlToPdf } from "@/lib/pdf";
import { escapeHtml } from "@/lib/documents/escape";
import type { OrgIdentity } from "@/lib/org-identity";
import type { ProformaCible } from "@/lib/factures/proforma";

const eur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const dfr = (d: Date) => d.toLocaleDateString("fr-FR");

export type ProformaMeta = { numero: string; dateEmission: Date; sessionRef: string };

const STYLE = `<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0D1B3E; padding-bottom: 10px; }
  .org-name { font-size: 15px; font-weight: 700; color: #0D1B3E; margin-bottom: 3px; }
  .org div { line-height: 1.5; }
  .meta { text-align: right; }
  .title { font-size: 18px; font-weight: 800; letter-spacing: .5px; color: #0D1B3E; }
  .meta div { line-height: 1.5; }
  .client { margin: 18px 0; padding: 10px 12px; border: 1px solid #ccc; border-radius: 6px; background: #F5F8FD; max-width: 60%; }
  .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .06em; color: #667; margin-bottom: 3px; }
  .client-name { font-weight: 700; font-size: 12px; color: #0D1B3E; }
  table.lines { border-collapse: collapse; width: 100%; margin-top: 6px; }
  table.lines th, table.lines td { border: 1px solid #bbb; padding: 6px 9px; text-align: left; vertical-align: top; }
  table.lines th { background: #0D1B3E; color: #fff; font-size: 10px; }
  .r { text-align: right; white-space: nowrap; }
  .totals { margin-top: 12px; margin-left: auto; width: 260px; }
  .totals > div { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; }
  .totals .ttc { font-weight: 800; font-size: 13px; color: #0D1B3E; border-bottom: none; border-top: 2px solid #0D1B3E; padding-top: 6px; }
  .mention { margin-top: 10px; font-size: 10px; color: #444; font-style: italic; }
  .legal { margin-top: 16px; padding: 8px 10px; border-left: 3px solid #E8A33D; background: #FFF8EC; font-size: 10px; color: #6b5220; }
  .foot { margin-top: 22px; border-top: 1px solid #ccc; padding-top: 6px; font-size: 8px; color: #666; }
</style>`;

export function proformaHtml(cible: ProformaCible, org: OrgIdentity, meta: ProformaMeta): string {
  const e = escapeHtml;
  const lignes = cible.lignes
    .map((l) => `<tr><td>${e(l.libelle)}</td><td class="r">${eur(l.montantHT)}</td></tr>`)
    .join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">${STYLE}</head><body>
    <div class="head">
      <div class="org">
        <div class="org-name">${e(org.name)}</div>
        <div>${e(org.adresse)}</div>
        <div>SIRET ${e(org.siret)} · NDA ${e(org.nda)}</div>
        <div>${e(org.email)}${org.telephone ? " · " + e(org.telephone) : ""}</div>
      </div>
      <div class="meta">
        <div class="title">FACTURE PROFORMA</div>
        <div>N° ${e(meta.numero)}</div>
        <div>Date : ${dfr(meta.dateEmission)}</div>
      </div>
    </div>

    <div class="client">
      <div class="lbl">Client</div>
      <div class="client-name">${e(cible.clientNom)}</div>
      ${cible.clientSiret ? `<div>SIRET ${e(cible.clientSiret)}</div>` : ""}
      ${cible.clientEmail ? `<div>${e(cible.clientEmail)}</div>` : ""}
      ${cible.conventionRef ? `<div>Convention&nbsp;: ${e(cible.conventionRef)}</div>` : ""}
    </div>

    <table class="lines">
      <thead><tr><th>Désignation</th><th class="r">Montant HT</th></tr></thead>
      <tbody>${lignes}</tbody>
    </table>

    <div class="totals">
      <div><span>Total HT</span><span>${eur(cible.montantHT)}</span></div>
      <div><span>TVA (${cible.tauxTva} %)</span><span>${eur(cible.montantTva)}</span></div>
      <div class="ttc"><span>Total TTC</span><span>${eur(cible.montantTTC)}</span></div>
    </div>

    <div class="mention">${e(cible.mentionTva)}</div>

    <div class="legal">
      <strong>Document proforma</strong> — ne constitue pas une facture et ne donne pas lieu à paiement définitif.
      Établi pour préparer la facturation&nbsp;; la facture définitive sera émise séparément.
    </div>

    <div class="foot">
      ${e(org.name)} — SIRET ${e(org.siret)} — Déclaration d'activité ${e(org.nda)}${org.qualiopi ? " — Qualiopi n° " + e(org.qualiopi) : ""}.
      Cet enregistrement ne vaut pas agrément de l'État.
    </div>
  </body></html>`;
}

function safeName(s: string) {
  return (s || "client")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function buildProformaPdf(
  cible: ProformaCible,
  org: OrgIdentity,
  meta: ProformaMeta,
): Promise<{ data: Uint8Array; filename: string }> {
  const html = proformaHtml(cible, org, meta);
  const data = await htmlToPdf(html);
  const filename = `proforma-${safeName(cible.clientNom)}-${safeName(meta.sessionRef)}.pdf`;
  return { data, filename };
}
