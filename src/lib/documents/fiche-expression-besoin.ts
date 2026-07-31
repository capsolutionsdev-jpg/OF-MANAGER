import type { FinancementType } from "@prisma/client";
import { htmlToPdf } from "@/lib/pdf";
import type { OrgIdentity } from "@/lib/org-identity";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";

// =============================================================
//  FICHE D'EXPRESSION DU BESOIN (indicateur Qualiopi 4)
//
//  Document généré à partir des données du CANDIDAT (stade prospect,
//  avant qu'une inscription/session n'existe forcément). Il fige, de
//  façon horodatée, l'analyse du besoin exprimé par le futur stagiaire.
//  Archivé en pièce jointe sur la fiche candidat → preuve pour l'audit.
// =============================================================

export type FicheBesoinCandidat = {
  prenom: string;
  nom: string;
  dateNaissance: Date | null;
  lieuNaissance: string | null;
  paysNaissance: string | null;
  nationalite: string | null;
  email: string;
  telephone: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  situationPro: string | null;
  employeur: string | null;
  objectifsFormation: string | null;
  periodeSouhaitee: string | null;
  sessionSouhaitee: string | null;
  financementType: FinancementType | null;
  situationHandicap: boolean;
  besoinsAdaptation: string | null;
  createdAt: Date;
};

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function frDate(d: Date | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const DASH = "—";
const val = (v: string | null | undefined): string => {
  const s = String(v ?? "").trim();
  return s ? esc(s) : DASH;
};

/** Une ligne clé/valeur d'un bloc. */
function row(label: string, value: string): string {
  return `<tr><td class="k">${esc(label)}</td><td class="v">${value}</td></tr>`;
}

/** Rend la fiche d'expression du besoin en HTML (A4, prêt pour htmlToPdf). */
export function buildFicheExpressionBesoinHtml(
  c: FicheBesoinCandidat,
  formationTitre: string | null,
  org: OrgIdentity,
): string {
  const naissance = [frDate(c.dateNaissance), c.lieuNaissance, c.paysNaissance]
    .filter((x) => x && x !== "—")
    .join(" à ")
    .trim();
  const adresse =
    [c.adresse, [c.codePostal, c.ville].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ") || DASH;
  const financement = c.financementType
    ? FINANCEMENT_LABELS[c.financementType]
    : DASH;
  const genereLe = frDate(new Date());

  const style = `<style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 2px solid #0D1B3E; padding-bottom: 10px; margin-bottom: 6px; }
    .org { font-size: 10px; line-height: 1.4; color: #333; }
    .org .name { font-size: 13px; font-weight: 700; color: #0D1B3E; }
    .title-box { text-align: right; }
    .title { font-size: 16px; font-weight: 800; color: #0D1B3E; letter-spacing: .3px; }
    .subtitle { font-size: 9px; color: #666; margin-top: 2px; }
    h2 { font-size: 11px; color: #0D1B3E; text-transform: uppercase; letter-spacing: .4px;
      border-left: 3px solid #1A5FD4; padding-left: 7px; margin: 14px 0 6px; }
    table.kv { width: 100%; border-collapse: collapse; }
    table.kv td { padding: 3px 6px; vertical-align: top; border-bottom: 1px solid #eef1f6; }
    td.k { width: 34%; color: #5a6785; font-weight: 600; }
    td.v { color: #111; }
    .note { background: #f6f8fc; border: 1px solid #e3e9f4; border-radius: 5px;
      padding: 7px 9px; margin-top: 5px; color: #333; }
    .foot { margin-top: 22px; display: flex; justify-content: space-between; align-items: flex-end; }
    .mention { font-size: 9px; color: #666; max-width: 62%; line-height: 1.4; }
    .sign { width: 32%; text-align: center; }
    .sign .line { border-top: 1px solid #999; margin-top: 34px; padding-top: 4px; font-size: 9px; color: #666; }
    .genere { font-size: 9px; color: #888; text-align: right; margin-bottom: 10px; }
  </style>`;

  const identite = `
    <h2>1. Identité du candidat</h2>
    <table class="kv">
      ${row("Nom et prénom", `${val(c.nom)} ${val(c.prenom)}`)}
      ${row("Né(e) le", naissance || DASH)}
      ${row("Nationalité", val(c.nationalite))}
      ${row("Adresse", adresse)}
      ${row("E-mail", val(c.email))}
      ${row("Téléphone", val(c.telephone))}
    </table>`;

  const entreprise = c.employeur
    ? `
    <h2>2. Entreprise (financement employeur)</h2>
    <table class="kv">
      ${row("Raison sociale", val(c.employeur))}
    </table>`
    : "";

  const projet = `
    <h2>${c.employeur ? "3" : "2"}. Formation &amp; période souhaitées</h2>
    <table class="kv">
      ${row("Formation demandée", val(formationTitre))}
      ${row("Session souhaitée", val(c.sessionSouhaitee))}
      ${row("Période souhaitée", val(c.periodeSouhaitee))}
    </table>`;

  const objectifs = `
    <h2>${c.employeur ? "4" : "3"}. Objectifs &amp; public concerné</h2>
    <table class="kv">
      ${row("Objectif poursuivi", val(c.objectifsFormation))}
      ${row("Situation professionnelle", val(c.situationPro))}
      ${row("Mode de financement envisagé", esc(financement))}
    </table>`;

  const handicap = `
    <h2>${c.employeur ? "5" : "4"}. Accessibilité &amp; situation de handicap</h2>
    <table class="kv">
      ${row(
        "Situation de handicap déclarée",
        c.situationHandicap ? "Oui" : "Non",
      )}
    </table>
    ${
      c.situationHandicap && c.besoinsAdaptation
        ? `<div class="note"><strong>Adaptations souhaitées :</strong> ${esc(c.besoinsAdaptation)}</div>`
        : ""
    }`;

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">${style}</head><body>
    <div class="header">
      <div class="org">
        <div class="name">${esc(org.name)}</div>
        ${esc(org.adresse)}<br>
        SIRET ${esc(org.siret)} · NDA ${esc(org.nda)}<br>
        ${esc(org.telephone)} · ${esc(org.email)}
      </div>
      <div class="title-box">
        <div class="title">FICHE D'EXPRESSION DU BESOIN</div>
        <div class="subtitle">Analyse du besoin — préalable à l'entrée en formation</div>
      </div>
    </div>
    <div class="genere">Demande reçue le ${frDate(c.createdAt)} · Document généré le ${genereLe}</div>
    ${identite}
    ${entreprise}
    ${projet}
    ${objectifs}
    ${handicap}
    <div class="foot">
      <div class="mention">
        ${esc(org.name)} — Organisme de formation certifié Qualiopi. Les informations
        recueillies servent exclusivement à l'analyse du besoin, à la personnalisation
        du parcours et au montage du dossier de financement (traitement conforme au RGPD).
      </div>
      <div class="sign">
        <div class="line">Cachet de l'organisme</div>
      </div>
    </div>
  </body></html>`;
}

/** Génère le PDF de la fiche d'expression du besoin. */
export async function generateFicheExpressionBesoinPdf(
  c: FicheBesoinCandidat,
  formationTitre: string | null,
  org: OrgIdentity,
): Promise<Uint8Array> {
  return htmlToPdf(buildFicheExpressionBesoinHtml(c, formationTitre, org));
}
