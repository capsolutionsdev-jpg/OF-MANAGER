import { prisma } from "@/lib/prisma";
import { htmlToPdf } from "@/lib/pdf";
import { orgConfigFor } from "@/lib/org-identity";
import {
  SITUATION_LABELS,
  LIEN_FORMATION_LABELS,
  type Suivi6MoisReponses,
} from "@/lib/suivi6mois";

export const runtime = "nodejs";
export const maxDuration = 60;

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const i = await prisma.inscription.findFirst({
    where: { suivi6moisToken: token },
    select: {
      organismeId: true,
      suivi6moisJson: true,
      suivi6moisSignature: true,
      suivi6moisCompletedAt: true,
      candidat: { select: { prenom: true, nom: true } },
      session: { select: { dateDebut: true, dateFin: true, formation: { select: { titre: true } } } },
    },
  });
  if (!i || !i.suivi6moisJson) return new Response("Document introuvable", { status: 404 });

  const r = i.suivi6moisJson as Suivi6MoisReponses;
  const org = await orgConfigFor(i.organismeId);
  const nom = `${i.candidat.prenom} ${i.candidat.nom}`;
  const dDate = (d: Date) => d.toLocaleDateString("fr-FR");
  const completed = i.suivi6moisCompletedAt ? dDate(i.suivi6moisCompletedAt) : "";

  const ligne = (label: string, val: string) =>
    val ? `<tr><td class="k">${esc(label)}</td><td>${esc(val)}</td></tr>` : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, Helvetica, sans-serif; color: #221F19; margin: 0; }
    .sheet { padding: 40px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { color: #2C53C0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
    .org { font-size: 12px; color: #555; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    td { border: 1px solid #ddd; padding: 8px 10px; vertical-align: top; }
    td.k { width: 38%; background: #f5f7fb; font-weight: bold; }
    .sig { margin-top: 26px; }
    .sig img { max-height: 90px; border: 1px solid #ddd; }
    .foot { font-size: 10px; color: #777; margin-top: 36px; border-top: 1px solid #ccc; padding-top: 8px; }
  </style></head><body>
    <div class="sheet">
      <p class="sub">Enquête de suivi à 6 mois — Qualiopi (indicateur 11)</p>
      <h1>Devenir professionnel du bénéficiaire</h1>
      <div class="org"><strong>${esc(org.name)}</strong> — ${esc(org.qualiopi)}</div>
      <table>
        ${ligne("Bénéficiaire", nom)}
        ${ligne("Formation suivie", i.session.formation.titre)}
        ${ligne("Période de formation", `${dDate(i.session.dateDebut)} au ${dDate(i.session.dateFin)}`)}
        ${ligne("Situation à 6 mois", SITUATION_LABELS[r.situation] ?? r.situation)}
        ${r.lienFormation ? ligne("En lien avec la formation", LIEN_FORMATION_LABELS[r.lienFormation] ?? r.lienFormation) : ""}
        ${ligne("Intitulé du poste", r.intitulePoste ?? "")}
        ${ligne("Employeur", r.employeur ?? "")}
        ${r.apportFormation != null ? ligne("Apport de la formation (0-10)", String(r.apportFormation)) : ""}
        ${ligne("Commentaire", r.commentaire ?? "")}
        ${ligne("Date de réponse", completed)}
      </table>
      <div class="sig">
        <p style="font-size:13px;margin:0 0 6px"><strong>Signature du bénéficiaire</strong></p>
        ${i.suivi6moisSignature ? `<img src="${i.suivi6moisSignature}" alt="signature" />` : "<em>Non signé</em>"}
      </div>
      <div class="foot">${esc(org.name)} · SIRET ${esc(org.siret)} · NDA ${esc(org.nda)} — Document généré le ${dDate(new Date())}.</div>
    </div>
  </body></html>`;

  const pdf = await htmlToPdf(html);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="suivi-6mois-${esc(i.candidat.nom)}.pdf"`,
    },
  });
}
