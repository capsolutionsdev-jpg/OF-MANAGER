import { euros, type FormuleKey } from "@/lib/plans";
import {
  optionByKey,
  packByKey,
  optionStatut,
  totalOptionsMois,
  totalPacksMois,
  totalPacksActivation,
  fraisMiseEnService,
} from "@/lib/options";

// =============================================================
//  CONTRAT DE PRESTATION éditeur ↔ OF client (abonnement OF Manager)
//  Helpers PURS + gabarit HTML (→ PDF via lib/pdf.ts, + aperçu page de signature).
//  Aucune dépendance serveur : importable partout (imports plans/options = purs).
// =============================================================

export type PrestataireIdentite = {
  nom: string;
  raisonSociale?: string | null;
  siret?: string | null;
  adresse?: string | null;
  representant?: string | null;
  email?: string | null;
  cachetUrl?: string | null;
};

export type ClientIdentite = {
  nom: string;
  raisonSociale?: string | null;
  siret?: string | null;
  adresse?: string | null;
  representant?: string | null;
  email?: string | null;
};

export type EngagementType = "MENSUEL" | "ANNUEL";

export type ContratData = {
  reference: string;
  palier: FormuleKey; // pour résoudre la disponibilité/prix des options
  formuleNom: string;
  montantMensuel: number; // € HT / mois (abonnement de base, avant remise)
  remisePct: number;
  engagement: EngagementType;
  options: string[]; // clés d'options à la carte (cf. lib/options)
  packs: string[]; // clés de packs métier
  fraisMiseEnService: number; // one-time HT (0 = offert / aucun)
  pionnier?: { variante: string | null; prixGele: boolean } | null;
  dateDebut?: Date | null;
  signataireNom?: string | null;
  signatureUrl?: string | null; // data URL du tracé (si signé)
  signedAt?: Date | null;
};

export const ENGAGEMENT_LABELS: Record<EngagementType, string> = {
  MENSUEL: "Mensuel, sans engagement",
  ANNUEL: "Annuel (12 mois)",
};

export const STATUT_PRESTATION_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé, en attente de signature",
  SIGNE: "Signé",
  REFUSE: "Refusé",
};

/** Montant mensuel net après remise (€ HT) — PUR. */
export function montantNet(montantMensuel: number, remisePct: number): number {
  const r = Math.min(100, Math.max(0, remisePct));
  return Math.round(montantMensuel * (1 - r / 100) * 100) / 100;
}

/** Montant total sur la période d'engagement (mensuel = 1 mois, annuel = 12). */
export function montantEngagement(net: number, engagement: EngagementType): number {
  return engagement === "ANNUEL" ? Math.round(net * 12 * 100) / 100 : net;
}

export type ContratTotals = {
  abonnementNet: number; // base après remise
  optionsMois: number; // options souscrites (facturées)
  packsMois: number; // packs métier récurrent
  recurrentMois: number; // total mensuel récurrent (net + options + packs)
  fraisUnique: number; // frais de mise en service (one-time)
  activationUnique: number; // activation packs (one-time)
  oneTimeTotal: number; // total des frais one-time
  totalEngagement: number; // récurrent × (12 si annuel, sinon 1)
  encaisseSignature: number; // 1er versement : récurrent (1 ou 12 mois) + one-time
};

/** Ventilation financière complète d'un contrat — PUR. */
export function computeContratTotals(d: ContratData): ContratTotals {
  const abonnementNet = montantNet(d.montantMensuel, d.remisePct);
  const optionsMois = totalOptionsMois(d.options, d.palier);
  const packsMois = totalPacksMois(d.packs);
  const recurrentMois = Math.round((abonnementNet + optionsMois + packsMois) * 100) / 100;
  // Cadeaux Pionniers : mise en service + activation offertes.
  const activationUnique = d.pionnier ? 0 : totalPacksActivation(d.packs);
  const fraisUnique = d.pionnier ? 0 : d.fraisMiseEnService;
  const oneTimeTotal = Math.round((fraisUnique + activationUnique) * 100) / 100;
  const totalEngagement = montantEngagement(recurrentMois, d.engagement);
  const encaisseSignature = Math.round((totalEngagement + oneTimeTotal) * 100) / 100;
  return {
    abonnementNet, optionsMois, packsMois, recurrentMois,
    fraisUnique, activationUnique, oneTimeTotal, totalEngagement, encaisseSignature,
  };
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(d?: Date | null): string {
  return d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
}

function ligneIdentite(label: string, i: PrestataireIdentite | ClientIdentite): string {
  const raison = i.raisonSociale || i.nom;
  const bits = [
    `<b>${esc(raison)}</b>`,
    i.siret ? `SIRET ${esc(i.siret)}` : "",
    i.adresse ? esc(i.adresse) : "",
    i.representant ? `représenté(e) par ${esc(i.representant)}` : "",
    i.email ? esc(i.email) : "",
  ].filter(Boolean);
  return `<p style="margin:0 0 4px"><span style="color:#64748b">${esc(label)} :</span><br>${bits.join("<br>")}</p>`;
}

const CELL_L = 'style="padding:6px 10px;border:1px solid #e2e8f0"';
const CELL_R = 'style="padding:6px 10px;border:1px solid #e2e8f0;text-align:right"';
function fRow(label: string, valueHtml: string): string {
  return `<tr><td ${CELL_L}>${label}</td><td ${CELL_R}>${valueHtml}</td></tr>`;
}

/** Gabarit HTML A4 complet du contrat de prestation. */
export function contratPrestationHtml(opts: {
  prestataire: PrestataireIdentite;
  client: ClientIdentite;
  contrat: ContratData;
}): string {
  const { prestataire, client, contrat } = opts;
  const t = computeContratTotals(contrat);
  const signeLe = contrat.signedAt ? fmtDate(contrat.signedAt) : null;

  const remiseHtml = contrat.remisePct > 0 ? fRow("Remise commerciale", `− ${contrat.remisePct} %`) : "";

  const optionRows = contrat.options
    .map((k) => {
      const o = optionByKey(k);
      if (!o) return fRow(esc(k), `<span style="color:#94a3b8">—</span>`);
      const st = optionStatut(o, contrat.palier);
      const val =
        st === "souscriptible" ? `${esc(euros(o.prixMois))} /mois`
          : st === "incluse" ? `<span style="color:#16a34a">inclus</span>`
            : `<span style="color:#94a3b8">—</span>`;
      return fRow(esc(o.label), val);
    })
    .join("");

  const packRows = contrat.packs
    .map((k) => {
      const p = packByKey(k);
      return p ? fRow(esc(p.label), `${esc(euros(p.prixMois))} /mois`) : "";
    })
    .join("");

  const totalEngagementRow =
    contrat.engagement === "ANNUEL" ? fRow("Total sur 12 mois (HT)", esc(euros(t.totalEngagement))) : "";

  const grossCadeaux = fraisMiseEnService(contrat.palier) + totalPacksActivation(contrat.packs);
  const fraisSection = contrat.pionnier
    ? `<p style="margin:0">Dans le cadre de l'<b>offre de lancement « Pionniers OFManager »</b> :</p>
       <ul style="margin:6px 0 0;padding-left:18px">
         <li>Mise en service et activation des packs métier <b>offertes</b>${grossCadeaux > 0 ? ` <span style="color:#94a3b8">(valeur ${esc(euros(grossCadeaux))})</span>` : ""}.</li>
         ${contrat.pionnier.prixGele ? `<li><b>Prix gelé à vie</b> sur le palier souscrit, tant que l'abonnement reste actif.</li>` : ""}
       </ul>
       <p style="margin:8px 0 0"><b>À régler à la signature : ${esc(euros(t.encaisseSignature))} HT</b> (${contrat.engagement === "ANNUEL" ? "12 mois payés d'avance" : "premier mois"}, mise en service offerte).</p>`
    : `<table>
         ${t.fraisUnique > 0 ? fRow("Frais de mise en service", esc(euros(t.fraisUnique))) : ""}
         ${t.activationUnique > 0 ? fRow("Activation pack(s) métier", esc(euros(t.activationUnique))) : ""}
         ${fRow("Total à la mise en service (HT)", `<b>${esc(euros(t.oneTimeTotal))}</b>`)}
       </table>
       <p class="muted" style="margin:6px 0 0;font-size:11px">Prélevé avec le premier mois — une seule facture. À régler à la signature : <b>${esc(euros(t.encaisseSignature))} HT</b>.</p>`;

  const cachet =
    prestataire.cachetUrl && prestataire.cachetUrl.startsWith("data:image/")
      ? `<img src="${prestataire.cachetUrl}" alt="Cachet" style="max-height:70px;margin-top:6px" />`
      : "";

  const signatureClient = contrat.signatureUrl?.startsWith("data:image/")
    ? `<img src="${esc(contrat.signatureUrl)}" alt="Signature" style="max-height:70px;margin-top:6px" />
       <p style="margin:4px 0 0;font-size:11px;color:#64748b">${esc(contrat.signataireNom ?? "")}${signeLe ? ` — le ${signeLe}` : ""}</p>`
    : `<p style="margin:28px 0 0;font-size:11px;color:#94a3b8">Signature à apposer</p>`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color:#1e293b; font-size:12.5px; line-height:1.55; margin:0; }
  h1 { font-size:19px; margin:0 0 2px; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:.04em; color:#2C53C0; margin:20px 0 6px; border-bottom:1px solid #e2e8f0; padding-bottom:3px; }
  table { border-collapse:collapse; width:100%; margin-top:6px; font-size:12px; }
  .muted { color:#64748b; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #2C53C0; padding-bottom:10px; }
  .ref { text-align:right; font-size:11px; color:#64748b; }
  .parties { display:flex; gap:24px; margin-top:10px; }
  .parties > div { flex:1; }
  .sign { display:flex; gap:24px; margin-top:26px; }
  .sign > div { flex:1; border:1px solid #e2e8f0; border-radius:8px; padding:10px; min-height:120px; }
</style></head><body>
  <div class="head">
    <div>
      <h1>Contrat de prestation de services</h1>
      <p class="muted" style="margin:0">Abonnement à la plateforme OF Manager</p>
    </div>
    <div class="ref">
      Réf. <b>${esc(contrat.reference)}</b><br>
      Établi le ${fmtDate(new Date())}
    </div>
  </div>

  <div class="parties">
    <div>${ligneIdentite("Le Prestataire", prestataire)}</div>
    <div>${ligneIdentite("Le Client", client)}</div>
  </div>

  <h2>Article 1 — Objet</h2>
  <p style="margin:0">Le Prestataire met à la disposition du Client, sous forme d'abonnement (logiciel en tant que service), la plateforme de gestion pour organismes de formation <b>OF Manager</b>, selon la formule, les options et les packs définis ci-après.</p>

  <h2>Article 2 — Formule &amp; conditions financières</h2>
  <table>
    ${fRow("Formule", `<b>${esc(contrat.formuleNom)}</b>`)}
    ${fRow("Abonnement mensuel (HT)", esc(euros(contrat.montantMensuel)))}
    ${remiseHtml}
    ${fRow("Abonnement net (HT)", `<b>${esc(euros(t.abonnementNet))}</b>`)}
    ${optionRows}
    ${packRows}
    ${fRow("Total mensuel récurrent (HT)", `<b>${esc(euros(t.recurrentMois))}</b>`)}
    ${fRow("Engagement", esc(ENGAGEMENT_LABELS[contrat.engagement]))}
    ${totalEngagementRow}
    ${fRow("Date d'effet", fmtDate(contrat.dateDebut))}
  </table>
  <p class="muted" style="margin:6px 0 0;font-size:11px">Prix hors taxes. Paiement par prélèvement SEPA sur mandat, à échéance ${contrat.engagement === "ANNUEL" ? "annuelle (12 mois payés d'avance)" : "mensuelle"}.</p>

  <h2>Article 3 — Frais initiaux${contrat.pionnier ? " &amp; offre de lancement" : ""}</h2>
  ${fraisSection}

  <h2>Article 4 — Durée, reconduction &amp; résiliation</h2>
  <p style="margin:0">Le contrat prend effet à la date d'effet ci-dessus pour la durée d'engagement indiquée, puis se reconduit tacitement par période équivalente. Chaque partie peut y mettre fin par écrit avec un préavis de trente (30) jours avant l'échéance. En cas de résiliation, l'accès est maintenu jusqu'au terme de la période réglée.</p>

  <h2>Article 5 — Données personnelles (RGPD)</h2>
  <p style="margin:0">Le Client demeure responsable de traitement des données de ses candidats ; le Prestataire agit en qualité de sous-traitant au sens du RGPD et s'engage à ne traiter ces données que pour l'exécution du service, à en garantir la sécurité et l'hébergement au sein de l'Union européenne. Un accord de sous-traitance (DPA) complète le présent contrat.</p>

  <h2>Article 6 — Signature</h2>
  <div class="sign">
    <div>
      <p class="muted" style="margin:0 0 2px;font-size:11px">Le Prestataire</p>
      <b>${esc(prestataire.representant ?? prestataire.nom)}</b>
      ${cachet}
    </div>
    <div>
      <p class="muted" style="margin:0 0 2px;font-size:11px">Le Client (précédé de « lu et approuvé »)</p>
      ${signatureClient}
    </div>
  </div>
</body></html>`;
}
