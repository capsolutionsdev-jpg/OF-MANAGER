import { htmlToPdf } from "@/lib/pdf";
import type { OrgIdentity } from "@/lib/org-identity";
import {
  T3P_METIER_LABELS,
  T3P_RESULTAT_LABELS,
  T3P_STATUT_LABELS,
  epreuvesDuType,
  etapesValidees,
  parcoursEtapes,
  type ParcoursT3PComplet,
} from "@/lib/t3p";

// =============================================================
//  FICHE DE SUIVI DU PARCOURS T3P (Taxi / VTC — examen CMA)
//
//  Récapitulatif horodaté d'un parcours d'accès à la profession :
//  les 11 étapes avec statut/date, le visa nominatif du collaborateur
//  ayant contrôlé chaque étape, et les présentations aux épreuves CMA.
//  Pièce de dossier Qualiopi (traçabilité du suivi et des contrôles).
// =============================================================

export type ParcoursT3PPdfData = {
  parcours: ParcoursT3PComplet & { mobilite: boolean };
  candidat: {
    prenom: string;
    nom: string;
    dateNaissance: Date | null;
    email: string;
    telephone: string | null;
  };
  formationTitre: string | null;
};

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function frDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

const STATUT_ETAPE_LABEL: Record<string, string> = {
  fait: "Fait",
  en_cours: "En cours",
  a_faire: "À faire",
};

/** Rend la fiche de suivi du parcours T3P en HTML (A4, prêt pour htmlToPdf). */
export function buildParcoursT3PHtml(data: ParcoursT3PPdfData, org: OrgIdentity): string {
  const { parcours: p, candidat: c, formationTitre } = data;
  const etapes = parcoursEtapes(p);
  const { validees, total } = etapesValidees(etapes);
  const metier = T3P_METIER_LABELS[p.metier];

  const style = `<style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 2px solid #0D1B3E; padding-bottom: 10px; margin-bottom: 6px; }
    .org { font-size: 10px; line-height: 1.4; color: #333; }
    .org .name { font-size: 13px; font-weight: 700; color: #0D1B3E; }
    .title-box { text-align: right; }
    .title { font-size: 15px; font-weight: 800; color: #0D1B3E; letter-spacing: .3px; }
    .subtitle { font-size: 9px; color: #666; margin-top: 2px; }
    .genere { font-size: 9px; color: #888; text-align: right; margin: 6px 0 10px; }
    h2 { font-size: 11px; color: #0D1B3E; text-transform: uppercase; letter-spacing: .4px;
      border-left: 3px solid #1A5FD4; padding-left: 7px; margin: 14px 0 6px; }
    table.kv { width: 100%; border-collapse: collapse; }
    table.kv td { padding: 3px 6px; vertical-align: top; border-bottom: 1px solid #eef1f6; }
    td.k { width: 26%; color: #5a6785; font-weight: 600; }
    .badge { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; }
    .b-encours { background: #e7f0ff; color: #1A5FD4; }
    .b-reussi { background: #e7f8ef; color: #0a7c42; }
    .b-abandonne { background: #fdeaea; color: #b3261e; }
    table.steps { width: 100%; border-collapse: collapse; margin-top: 4px; }
    table.steps th { background: #0D1B3E; color: #fff; font-size: 9px; text-transform: uppercase;
      letter-spacing: .3px; padding: 5px 6px; text-align: left; }
    table.steps td { padding: 5px 6px; border-bottom: 1px solid #e9edf4; vertical-align: top; }
    table.steps tr.done td { background: #f4fbf7; }
    .num { width: 22px; text-align: center; font-weight: 700; color: #5a6785; }
    .st { font-weight: 600; }
    .st.fait { color: #0a7c42; }
    .st.en_cours { color: #1A5FD4; }
    .st.a_faire { color: #98a2b3; }
    .visa { color: #0a7c42; font-weight: 600; }
    .visa small { display: block; color: #6b7280; font-weight: 400; }
    .no-visa { color: #b3b9c4; }
    .foot { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .mention { font-size: 9px; color: #666; max-width: 60%; line-height: 1.4; }
    .sign { width: 32%; text-align: center; }
    .sign .line { border-top: 1px solid #999; margin-top: 30px; padding-top: 4px; font-size: 9px; color: #666; }
    .recap { font-size: 10px; color: #333; margin: 4px 0 2px; }
    .recap strong { color: #0a7c42; }
  </style>`;

  const statutClass =
    p.statut === "REUSSI" ? "b-reussi" : p.statut === "ABANDONNE" ? "b-abandonne" : "b-encours";

  const stepsRows = etapes
    .map((e) => {
      const dateTxt = e.faitLe ? ` · ${frDate(e.faitLe)}` : "";
      const visa = e.validation
        ? `<span class="visa">${esc(e.validation.nom)}<small>le ${frDate(e.validation.date)}</small></span>`
        : `<span class="no-visa">—</span>`;
      return `<tr class="${e.statut === "fait" ? "done" : ""}">
        <td class="num">${e.num}</td>
        <td>${esc(e.label)}</td>
        <td><span class="st ${e.statut}">${STATUT_ETAPE_LABEL[e.statut] ?? e.statut}</span><span style="color:#98a2b3">${dateTxt}</span></td>
        <td>${visa}</td>
      </tr>`;
    })
    .join("");

  const epreuveRows = (["THEORIE", "PRATIQUE"] as const)
    .flatMap((type) =>
      epreuvesDuType(p, type).map((ep) => {
        const label = type === "THEORIE" ? "Admissibilité (théorie)" : "Admission (pratique)";
        return `<tr>
          <td>${esc(label)} — présentation n°${ep.tentative}</td>
          <td>${frDate(ep.date)}</td>
          <td>${esc(T3P_RESULTAT_LABELS[ep.resultat] ?? ep.resultat)}</td>
          <td>${esc(ep.note ?? "—")}</td>
        </tr>`;
      }),
    )
    .join("");

  const epreuvesBloc = epreuveRows
    ? `<h2>3. Épreuves (CMA)</h2>
       <table class="steps">
         <tr><th>Épreuve</th><th>Date</th><th>Résultat</th><th>Note</th></tr>
         ${epreuveRows}
       </table>`
    : "";

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">${style}</head><body>
    <div class="header">
      <div class="org">
        <div class="name">${esc(org.name)}</div>
        ${esc(org.adresse)}<br>
        SIRET ${esc(org.siret)} · NDA ${esc(org.nda)}<br>
        ${esc(org.telephone)} · ${esc(org.email)}
      </div>
      <div class="title-box">
        <div class="title">FICHE DE SUIVI — PARCOURS ${esc(metier.toUpperCase())}</div>
        <div class="subtitle">Accès à la profession (examen T3P — CMA)${p.mobilite ? " · passerelle (mobilité)" : ""}</div>
      </div>
    </div>
    <div class="genere">Document généré le ${frDate(new Date())}</div>

    <h2>1. Candidat</h2>
    <table class="kv">
      <tr><td class="k">Nom et prénom</td><td>${esc(c.nom)} ${esc(c.prenom)}</td></tr>
      <tr><td class="k">Né(e) le</td><td>${frDate(c.dateNaissance)}</td></tr>
      <tr><td class="k">Contact</td><td>${esc(c.email)}${c.telephone ? " · " + esc(c.telephone) : ""}</td></tr>
      <tr><td class="k">Formation de préparation</td><td>${esc(formationTitre ?? "—")}</td></tr>
      <tr><td class="k">Statut du parcours</td><td><span class="badge ${statutClass}">${esc(T3P_STATUT_LABELS[p.statut] ?? p.statut)}</span></td></tr>
    </table>

    <h2>2. Étapes du parcours &amp; visas de contrôle</h2>
    <div class="recap">Étapes validées par un collaborateur : <strong>${validees}/${total}</strong></div>
    <table class="steps">
      <tr><th class="num">N°</th><th>Étape</th><th>Statut</th><th>Visa du collaborateur</th></tr>
      ${stepsRows}
    </table>

    ${epreuvesBloc}

    <div class="foot">
      <div class="mention">
        ${esc(org.name)} — Organisme de formation certifié Qualiopi. Cette fiche
        récapitule le suivi du parcours d'accès à la profession et les contrôles
        opérés par les collaborateurs (visas nominatifs et horodatés).
      </div>
      <div class="sign">
        <div class="line">Cachet de l'organisme</div>
      </div>
    </div>
  </body></html>`;
}

/** Génère le PDF de la fiche de suivi du parcours T3P. */
export async function generateParcoursT3PPdf(data: ParcoursT3PPdfData, org: OrgIdentity): Promise<Uint8Array> {
  return htmlToPdf(buildParcoursT3PHtml(data, org));
}
