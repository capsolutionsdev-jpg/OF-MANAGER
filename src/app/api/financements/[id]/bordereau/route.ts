import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { htmlToPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const eur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const jour = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

/** Bordereau de prise en charge OPCO (PDF) — à transmettre au financeur. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !organismeId || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const { id } = await params;

  const db = await getTenantDb();
  const d = await db.dossierFinancement.findUnique({
    where: { id },
    include: {
      candidat: { select: { nom: true, prenom: true, email: true } },
      inscription: {
        select: {
          session: {
            select: {
              dateDebut: true,
              dateFin: true,
              formation: { select: { titre: true, dureeHeures: true } },
            },
          },
        },
      },
    },
  });
  if (!d) return new Response("Dossier introuvable", { status: 404 });

  const org = await orgConfigFor(organismeId);
  const f = d.inscription?.session?.formation;
  const s = d.inscription?.session;
  const montant = Number(d.priseEnChargeMontant ?? d.montant ?? 0);

  const emetteur = [
    `<strong>${esc(org.name)}</strong>`,
    esc(org.adresse),
    org.siret ? `SIRET : ${esc(org.siret)}` : "",
    org.nda ? `Déclaration d'activité : ${esc(org.nda)}` : "",
    org.email ? esc(org.email) : "",
    org.telephone ? esc(org.telephone) : "",
  ].filter(Boolean).join("<br>");

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1b2440;font-size:12px;margin:32px}
    h1{font-size:20px;color:#0D1B3E;margin:0 0 4px}
    .top{display:flex;justify-content:space-between;gap:24px}
    .box{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px}
    .muted{color:#6b7280}
    .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-top:24px}
    th,td{padding:8px 10px;text-align:left} thead th{background:#0D1B3E;color:#fff;font-size:11px}
    tbody td{border-bottom:1px solid #eef0f4}
    .r{text-align:right} .tot{font-weight:700;font-size:14px}
    .foot{margin-top:36px;border-top:1px solid #e5e7eb;padding-top:8px;color:#9aa3b2;font-size:10px;text-align:center}
    .pill{display:inline-block;padding:2px 8px;border-radius:99px;background:#ecfdf5;color:#047857;font-weight:600;font-size:11px}
  </style></head><body>
    <div class="top">
      <div>
        <h1>Bordereau de prise en charge</h1>
        <div class="muted">Financeur : <strong>${esc(d.financeur ?? "OPCO")}</strong></div>
        ${d.opcoNumero ? `<div class="muted">N° de dossier : ${esc(d.opcoNumero)}</div>` : ""}
        <div class="muted">Date : ${jour(new Date())}</div>
      </div>
      <div class="box">${emetteur}</div>
    </div>

    <div style="margin-top:24px" class="box">
      <div class="lbl">Stagiaire</div>
      <strong>${esc(`${d.candidat?.prenom ?? ""} ${d.candidat?.nom ?? ""}`.trim() || "—")}</strong>
      ${d.candidat?.email ? `<br><span class="muted">${esc(d.candidat.email)}</span>` : ""}
    </div>

    <table>
      <thead><tr><th>Action de formation</th><th class="r">Montant demandé</th></tr></thead>
      <tbody>
        <tr>
          <td>
            <strong>${esc(f?.titre ?? "Formation")}</strong>
            <div class="muted">
              ${s ? `Du ${jour(s.dateDebut)} au ${jour(s.dateFin)}` : ""}
              ${f?.dureeHeures ? ` · ${f.dureeHeures} h` : ""}
            </div>
          </td>
          <td class="r tot">${eur(montant)}</td>
        </tr>
      </tbody>
    </table>

    <p style="margin-top:16px">
      Mode de règlement : <span class="pill">${d.subrogation ? "Subrogation — règlement direct à l'organisme" : "Règlement au stagiaire / entreprise"}</span>
    </p>

    <div class="foot">${esc(org.name)}${org.siret ? " — SIRET " + esc(org.siret) : ""}${org.nda ? " — NDA " + esc(org.nda) : ""}</div>
  </body></html>`;

  const pdf = await htmlToPdf(html);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bordereau-${id}.pdf"`,
    },
  });
}
