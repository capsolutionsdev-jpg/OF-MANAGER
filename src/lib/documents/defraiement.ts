import "server-only";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { htmlToPdf } from "@/lib/pdf";

const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const fdate = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "…………………");
const euro = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/**
 * Construit la note de défraiement (PDF) d'un membre de jury pour une session :
 * juré, formation/examen, nature & date, montant, avec cachet + signature de
 * l'OF pré-enregistrés. Utilisé par la route de téléchargement ET l'envoi mail.
 * Scopé au tenant via getTenantDb.
 */
export async function buildDefraiementPdf(
  affectationId: string,
): Promise<{ data: Uint8Array; filename: string; juryEmail: string | null; juryNom: string } | null> {
  const db = await getTenantDb();
  const a = await db.juryAffectation.findFirst({
    where: { id: affectationId },
    include: {
      jury: true,
      session: { include: { formation: { select: { titre: true, certification: true } } } },
    },
  });
  if (!a) return null;

  const org = await orgConfigFor(a.organismeId);
  const juryNom = `${a.jury.prenom} ${a.jury.nom}`.trim();
  const dateExamen = a.dateExamen ?? a.session.dateExamen ?? a.session.dateDebut;

  const cachet = org.cachetUrl
    ? `<img src="${org.cachetUrl}" alt="cachet" style="max-height:80px;max-width:160px;object-fit:contain" />`
    : "";
  const signature = org.signatureUrl
    ? `<img src="${org.signatureUrl}" alt="signature" style="max-height:64px;max-width:160px;object-fit:contain" />`
    : "";

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:13px;line-height:1.55;margin:0;padding:40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1A5FD4;padding-bottom:14px;margin-bottom:24px}
    .of strong{font-size:14px;color:#0D1B3E}
    .of{font-size:12px;color:#333}
    h1{font-size:19px;color:#0D1B3E;margin:24px 0 4px}
    .sub{color:#555;margin-bottom:22px}
    .box{border:1px solid #ddd;border-radius:8px;padding:16px 20px;margin:16px 0;background:#fafbff}
    .row{margin:6px 0}
    .label{display:inline-block;min-width:180px;color:#555}
    .val{font-weight:bold;color:#0D1B3E}
    .montant{font-size:22px;color:#0D1B3E;font-weight:bold}
    .sign{margin-top:44px;display:flex;justify-content:flex-end}
    .sign .cap{text-align:center;font-size:12px;color:#333}
    .cadre{height:110px;display:flex;align-items:center;justify-content:center}
    .foot{margin-top:36px;font-size:10px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:10px}
  </style></head><body>
    <div class="header">
      <div class="of">
        <strong>${esc(org.name)}</strong><br/>
        ${esc(org.adresse)}<br/>
        ${org.siret ? `SIRET : ${esc(org.siret)}<br/>` : ""}
        ${org.nda ? `Déclaration d'activité : ${esc(org.nda)}` : ""}
      </div>
      <div class="of" style="text-align:right">
        ${org.email ? `${esc(org.email)}<br/>` : ""}${org.telephone ? esc(org.telephone) : ""}
      </div>
    </div>

    <h1>Note de défraiement — Jury d'examen</h1>
    <div class="sub">Indemnisation d'un membre de jury au titre de sa participation à l'examen.</div>

    <div class="box">
      <div class="row"><span class="label">Membre du jury</span> <span class="val">${esc(juryNom)}</span>${a.jury.qualite ? ` — ${esc(a.jury.qualite)}` : ""}</div>
      ${a.jury.email ? `<div class="row"><span class="label">Contact</span> <span class="val">${esc(a.jury.email)}</span></div>` : ""}
      <div class="row"><span class="label">Formation / titre</span> <span class="val">${esc(a.session.formation.titre)}${a.session.formation.certification ? ` (${esc(a.session.formation.certification)})` : ""}</span></div>
      <div class="row"><span class="label">Nature de l'examen</span> <span class="val">${esc(a.natureExamen) || "Épreuve de certification"}</span></div>
      <div class="row"><span class="label">Date de l'examen</span> <span class="val">${fdate(dateExamen)}</span></div>
    </div>

    <p>Montant du défraiement dû&nbsp;: <span class="montant">${euro(a.prixCents)}</span></p>
    <p style="color:#555">Fait à ${esc(org.ville)}, le ${fdate(new Date())}.</p>

    <div class="sign">
      <div class="cap">
        <div class="cadre">${signature || cachet ? `<div>${signature}<br/>${cachet}</div>` : "Cachet & signature"}</div>
        Pour ${esc(org.name)} — ${esc(org.representant)}, ${esc(org.representantQualite)}
      </div>
    </div>

    <div class="foot">${esc(org.name)} · ${esc(org.adresse)} · ${org.nda ? `NDA ${esc(org.nda)}` : ""}</div>
  </body></html>`;

  const data = await htmlToPdf(html);
  return {
    data,
    filename: `defraiement-${a.jury.nom}-${new Date().toISOString().slice(0, 10)}.pdf`,
    juryEmail: a.jury.email,
    juryNom,
  };
}
