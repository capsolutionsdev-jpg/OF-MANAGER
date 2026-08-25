import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { htmlToPdf } from "@/lib/pdf";
import { userCanAccessSection } from "@/lib/section-guard";

export const runtime = "nodejs";
export const maxDuration = 60; // génération PDF (Chromium serverless)

const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const fdate = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
const eur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/**
 * Reçu de paiement (PDF, A4 portrait) à remettre au client — surtout pour les
 * règlements en espèces. Reprend : titulaire, total dû, montant du versement,
 * total déjà réglé, reste à régler, et le collaborateur qui a encaissé.
 * Réservé à la section « comptabilité » (comme la saisie des règlements).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !organismeId) return new Response("Non autorisé", { status: 401 });
  if (!(await userCanAccessSection("comptabilite"))) {
    return new Response("Accès réservé à la comptabilité", { status: 403 });
  }

  const { id } = await params;
  const db = await getTenantDb();
  const p = await db.paiement.findFirst({
    where: { id },
    include: {
      inscription: {
        include: {
          candidat: { select: { nom: true, prenom: true } },
          factures: { select: { montantTTC: true } },
          paiements: { select: { montant: true } },
          session: { select: { formation: { select: { titre: true } } } },
        },
      },
      enregistrePar: { select: { name: true } },
    },
  });
  if (!p || !p.inscription) return new Response("Règlement introuvable", { status: 404 });

  const insc = p.inscription;
  const org = await orgConfigFor(organismeId);

  const du =
    insc.montant != null
      ? Number(insc.montant)
      : insc.factures.reduce((s, f) => s + Number(f.montantTTC), 0);
  const versement = Number(p.montant);
  const totalVerse = insc.paiements.reduce((s, x) => s + Number(x.montant), 0);
  const reste = du > 0 ? Math.max(0, du - totalVerse) : null;

  const num = `REÇU-${p.id.slice(-8).toUpperCase()}`;
  const candidat = `${insc.candidat.prenom} ${insc.candidat.nom}`;
  const formationTitre = insc.session?.formation?.titre ?? null;
  const encaissePar = p.enregistrePar?.name ?? session.user.name ?? "—";

  const cachet = org.cachetUrl
    ? `<img src="${org.cachetUrl}" alt="cachet" style="max-height:80px;max-width:150px;object-fit:contain" />`
    : "";
  const signature = org.signatureUrl
    ? `<img src="${org.signatureUrl}" alt="signature" style="max-height:60px;max-width:150px;object-fit:contain" />`
    : "";

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:13px;line-height:1.5;margin:0;padding:40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1A5FD4;padding-bottom:14px;margin-bottom:20px}
    .of{font-size:12px;color:#333}
    .of strong{font-size:14px;color:#0D1B3E}
    .title-row{display:flex;justify-content:space-between;align-items:flex-end;margin:24px 0 6px}
    h1{font-size:22px;color:#0D1B3E;margin:0}
    .num{font-size:12px;color:#555;text-align:right}
    .num b{color:#0D1B3E;font-size:13px}
    .box{border:1px solid #e2e6f0;border-radius:10px;padding:16px 20px;margin:16px 0;background:#fafbff}
    .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #e8ecf5}
    .row:last-child{border-bottom:none}
    .row .k{color:#555}
    .row .v{font-weight:bold;color:#0D1B3E}
    .amount{display:flex;justify-content:space-between;align-items:center;border:1.5px solid #1A5FD4;border-radius:10px;padding:14px 20px;margin:16px 0;background:#eff5ff}
    .amount .lab{font-size:13px;color:#0D1B3E;font-weight:bold}
    .amount .big{font-size:24px;font-weight:800;color:#1A5FD4}
    .grid{display:flex;gap:14px;margin:8px 0}
    .card{flex:1;border:1px solid #e2e6f0;border-radius:8px;padding:12px 14px;text-align:center;background:#fff}
    .card .c-lab{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.04em}
    .card .c-val{font-size:17px;font-weight:bold;color:#0D1B3E;margin-top:2px}
    .card.rest .c-val{color:#b45309}
    .card.paid .c-val{color:#047857}
    .signs{display:flex;justify-content:flex-end;margin-top:36px}
    .sign{width:60%;text-align:center}
    .sign .cadre{min-height:100px;border:1px dashed #cbd3e1;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#9aa4b8;padding:8px}
    .sign .cap{margin-top:8px;font-size:12px;color:#333}
    .foot{margin-top:34px;font-size:10px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:10px}
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

    <div class="title-row">
      <h1>Reçu de paiement</h1>
      <div class="num">N°&nbsp;<b>${esc(num)}</b><br/>Émis le ${fdate(new Date())}</div>
    </div>

    <div class="box">
      <div class="row"><span class="k">Reçu de</span><span class="v">${esc(candidat)}</span></div>
      ${formationTitre ? `<div class="row"><span class="k">Formation</span><span class="v">${esc(formationTitre)}</span></div>` : ""}
      <div class="row"><span class="k">Date du règlement</span><span class="v">${fdate(p.date)}</span></div>
      <div class="row"><span class="k">Moyen de paiement</span><span class="v">${esc(p.mode) || "—"}</span></div>
      ${p.reference ? `<div class="row"><span class="k">Référence</span><span class="v">${esc(p.reference)}</span></div>` : ""}
    </div>

    <div class="amount">
      <span class="lab">Montant reçu</span>
      <span class="big">${eur(versement)}</span>
    </div>

    <div class="grid">
      <div class="card"><div class="c-lab">Total de la facture</div><div class="c-val">${du > 0 ? eur(du) : "—"}</div></div>
      <div class="card paid"><div class="c-lab">Déjà réglé</div><div class="c-val">${eur(totalVerse)}</div></div>
      <div class="card rest"><div class="c-lab">Reste à régler</div><div class="c-val">${reste != null ? eur(reste) : "—"}</div></div>
    </div>

    <p style="margin-top:18px">Reçu la somme de <strong>${eur(versement)}</strong> de la part de <strong>${esc(candidat)}</strong>${p.mode ? ` (${esc(p.mode)})` : ""}.</p>

    <div class="signs">
      <div class="sign">
        <div class="cadre">${signature || cachet ? `<div>${signature}<br/>${cachet}</div>` : "Cachet & signature"}</div>
        <div class="cap">Encaissé par <strong>${esc(encaissePar)}</strong><br/>pour ${esc(org.name)}</div>
      </div>
    </div>

    <div class="foot">${esc(org.name)} · ${esc(org.adresse)}${org.nda ? ` · NDA ${esc(org.nda)}` : ""} — Reçu ${esc(num)}</div>
  </body></html>`;

  const pdf = await htmlToPdf(html);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recu-paiement-${esc(insc.candidat.nom)}.pdf"`,
    },
  });
}
