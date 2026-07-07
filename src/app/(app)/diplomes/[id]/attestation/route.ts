import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { htmlToPdf } from "@/lib/pdf";
import { hasStrictFeature } from "@/lib/feature-guard";

export const runtime = "nodejs";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const fdate = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "…………………");

/**
 * Attestation de remise de diplôme (PDF). Reprend les coordonnées du candidat,
 * la formation et le n° de diplôme, avec deux emplacements de signature :
 * le candidat (à signer à la remise) et l'organisme (cachet + signature
 * pré-enregistrés). Réservé au module `diplomes`.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !STAFF.includes(session.user.role as string) || !organismeId) {
    return new Response("Non autorisé", { status: 401 });
  }
  if (!(await hasStrictFeature("diplomes"))) {
    return new Response("Module non activé", { status: 403 });
  }

  const { id } = await params;
  const db = await getTenantDb();
  const d = await db.diplome.findFirst({ where: { id } });
  if (!d) return new Response("Diplôme introuvable", { status: 404 });

  const org = await orgConfigFor(organismeId);
  const formation = d.formationId
    ? await db.formation.findFirst({ where: { id: d.formationId }, select: { titre: true, certification: true } })
    : null;

  const cachet = org.cachetUrl
    ? `<img src="${org.cachetUrl}" alt="cachet" style="max-height:90px;max-width:170px;object-fit:contain" />`
    : "";
  const signature = org.signatureUrl
    ? `<img src="${org.signatureUrl}" alt="signature" style="max-height:70px;max-width:170px;object-fit:contain" />`
    : "";

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:13px;line-height:1.5;margin:0;padding:40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1A5FD4;padding-bottom:14px;margin-bottom:26px}
    .of{font-size:12px;color:#333}
    .of strong{font-size:14px;color:#0D1B3E}
    h1{font-size:20px;text-align:center;color:#0D1B3E;margin:30px 0 6px}
    .sub{text-align:center;color:#555;margin-bottom:30px}
    .box{border:1px solid #ddd;border-radius:8px;padding:18px 22px;margin:18px 0;background:#fafbff}
    .row{margin:7px 0}
    .label{display:inline-block;min-width:190px;color:#555}
    .val{font-weight:bold;color:#0D1B3E}
    .signs{display:flex;justify-content:space-between;gap:40px;margin-top:48px}
    .sign{flex:1;text-align:center}
    .sign .cadre{height:120px;border:1px dashed #bbb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#aaa}
    .sign .cap{margin-top:8px;font-size:12px;color:#333}
    .foot{margin-top:40px;font-size:10px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:10px}
  </style></head><body>
    <div class="header">
      <div class="of">
        <strong>${esc(org.name)}</strong><br/>
        ${esc(org.adresse)}<br/>
        ${org.siret ? `SIRET : ${esc(org.siret)}<br/>` : ""}
        ${org.nda ? `Déclaration d'activité : ${esc(org.nda)}` : ""}
      </div>
      <div class="of" style="text-align:right">
        ${org.email ? `${esc(org.email)}<br/>` : ""}
        ${org.telephone ? `${esc(org.telephone)}` : ""}
      </div>
    </div>

    <h1>Attestation de remise de diplôme</h1>
    <div class="sub">Document attestant la remise en main propre du diplôme au candidat.</div>

    <p>Je soussigné(e) <strong>${esc(org.representant)}</strong>, ${esc(org.representantQualite)} de
    l'organisme <strong>${esc(org.name)}</strong>, atteste avoir remis le diplôme à&nbsp;:</p>

    <div class="box">
      <div class="row"><span class="label">Nom et prénom</span> <span class="val">${esc(d.prenom)} ${esc(d.nom)}</span></div>
      <div class="row"><span class="label">Né(e) le</span> <span class="val">${fdate(d.dateNaissance)}</span>${d.lieuNaissance ? ` <span class="label" style="min-width:auto">à</span> <span class="val">${esc(d.lieuNaissance)}</span>` : ""}</div>
      ${formation ? `<div class="row"><span class="label">Formation</span> <span class="val">${esc(formation.titre)}${formation.certification ? ` (${esc(formation.certification)})` : ""}</span></div>` : ""}
      <div class="row"><span class="label">N° du diplôme</span> <span class="val">${esc(d.numeroDiplome) || "…………………………"}</span></div>
      <div class="row"><span class="label">Date de remise</span> <span class="val">${fdate(d.remisAt ?? new Date())}</span></div>
    </div>

    <p>Cette attestation est délivrée pour servir et valoir ce que de droit.</p>

    <div class="signs">
      <div class="sign">
        <div class="cadre">Signature du candidat</div>
        <div class="cap">Le candidat — ${esc(d.prenom)} ${esc(d.nom)}</div>
      </div>
      <div class="sign">
        <div class="cadre">${signature || cachet ? `<div>${signature}<br/>${cachet}</div>` : "Cachet & signature de l'organisme"}</div>
        <div class="cap">Pour ${esc(org.name)} — ${esc(org.representant)}, ${esc(org.representantQualite)}</div>
      </div>
    </div>

    <div class="foot">${esc(org.name)} · ${esc(org.adresse)} · ${org.nda ? `NDA ${esc(org.nda)}` : ""}</div>
  </body></html>`;

  const pdf = await htmlToPdf(html);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="attestation-remise-${esc(d.nom)}.pdf"`,
    },
  });
}
