import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { htmlToPdf } from "@/lib/pdf";
import type { CivicMention, CivicPaiementMethode } from "@prisma/client";

export const runtime = "nodejs";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

const MENTION_LABEL: Record<CivicMention, string> = {
  CSP: "Préparation à l'examen civique — Carte de séjour pluriannuelle (CSP)",
  CR: "Préparation à l'examen civique — Carte de résident (CR)",
  NATURALISATION: "Préparation à l'examen civique — Naturalisation",
};
const METHODE_LABEL: Record<CivicPaiementMethode, string> = {
  STRIPE: "Carte bancaire (paiement en ligne)",
  CB_TPE: "Carte bancaire (terminal)",
  ESPECES: "Espèces",
  CHEQUE: "Chèque",
  VIREMENT: "Virement bancaire",
};

const eur = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !STAFF.includes(session.user.role as string) || !organismeId) {
    return new Response("Non autorisé", { status: 401 });
  }
  const { id } = await params;

  const f = await prisma.civicFacture.findFirst({ where: { id, organismeId } });
  if (!f) return new Response("Facture introuvable", { status: 404 });
  const org = await prisma.organisme.findUnique({ where: { id: organismeId } });

  const emetteur = [
    `<strong>${esc(org?.raisonSociale || org?.nom || "Organisme de formation")}</strong>`,
    esc(org?.adresse),
    esc([org?.codePostal, org?.ville].filter(Boolean).join(" ")),
    org?.siret ? `SIRET : ${esc(org.siret)}` : "",
    org?.nda ? `Déclaration d'activité : ${esc(org.nda)}` : "",
    org?.numeroTva ? `TVA intra. : ${esc(org.numeroTva)}` : "",
    org?.email ? `${esc(org.email)}` : "",
    org?.telephone ? `${esc(org.telephone)}` : "",
  ]
    .filter(Boolean)
    .join("<br>");

  const client = [
    `<strong>${esc(f.clientNom)}</strong>`,
    esc(f.clientAdresse),
    esc(f.clientEmail),
  ]
    .filter(Boolean)
    .join("<br>");

  const dateStr = new Date(f.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const tvaLine = f.exonereTva
    ? `<tr><td>TVA</td><td class="r">Exonérée *</td></tr>`
    : `<tr><td>TVA (${f.tvaPct} %)</td><td class="r">${eur(f.tvaCents)}</td></tr>`;
  const exoNote = f.exonereTva
    ? `<p class="note">* TVA non applicable, art. 261-4-4°&nbsp;a du Code général des impôts (action de formation professionnelle).</p>`
    : "";

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1b2440; font-size: 12px; margin: 32px; }
    .top { display: flex; justify-content: space-between; gap: 24px; }
    h1 { font-size: 22px; color: #0D1B3E; margin: 0 0 2px; }
    .muted { color: #6b7280; }
    .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
    .parties { display: flex; gap: 16px; margin-top: 24px; }
    .parties > div { flex: 1; }
    .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { padding: 8px 10px; text-align: left; }
    thead th { background: #0D1B3E; color: #fff; font-size: 11px; }
    tbody td { border-bottom: 1px solid #eef0f4; }
    .r { text-align: right; }
    .totaux { width: 280px; margin-left: auto; margin-top: 12px; }
    .totaux td { padding: 6px 10px; }
    .ttc { font-weight: 700; font-size: 14px; border-top: 2px solid #0D1B3E; }
    .pay { margin-top: 20px; }
    .note { color: #6b7280; font-size: 10px; margin-top: 16px; }
    .footer { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 8px; color: #9aa3b2; font-size: 10px; text-align: center; }
    .pill { display:inline-block; padding:2px 8px; border-radius:99px; background:#ecfdf5; color:#047857; font-weight:600; font-size:11px; }
  </style></head><body>
    <div class="top">
      <div><h1>Facture</h1><div class="muted">N° ${esc(f.numero)}</div><div class="muted">Date : ${dateStr}</div></div>
      <div class="box">${emetteur}</div>
    </div>

    <div class="parties">
      <div class="box"><div class="lbl">Facturé à</div>${client}</div>
      <div class="box"><div class="lbl">Règlement</div>${esc(METHODE_LABEL[f.methode])}<br>
        Statut : <span class="pill">${esc(f.paiementId ? "Payé" : "—")}</span></div>
    </div>

    <table>
      <thead><tr><th>Désignation</th><th class="r">Montant</th></tr></thead>
      <tbody>
        <tr><td>${esc(MENTION_LABEL[f.mention])}<br><span class="muted">Formation 100 % en ligne — accès individuel</span></td><td class="r">${eur(f.montantHtCents)}</td></tr>
      </tbody>
    </table>

    <table class="totaux">
      <tr><td>Total HT</td><td class="r">${eur(f.montantHtCents)}</td></tr>
      ${tvaLine}
      <tr class="ttc"><td>Total TTC</td><td class="r">${eur(f.montantTtcCents)}</td></tr>
    </table>

    ${exoNote}
    <p class="note">Préparation non certifiante — non éligible au CPF ni à une prise en charge OPCO.</p>

    <div class="footer">${esc(org?.raisonSociale || org?.nom || "")}${org?.siret ? " — SIRET " + esc(org.siret) : ""}</div>
  </body></html>`;

  const pdf = await htmlToPdf(html);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="facture-${f.numero}.pdf"`,
    },
  });
}
