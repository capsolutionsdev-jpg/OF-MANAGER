import { euros } from "@/lib/plans";

// =============================================================
//  FACTURE ÉDITEUR → OF client — conforme réforme e-invoicing FR 2026-2027
//  Helpers PURS : calculs, mentions obligatoires, gabarit PDF (HTML) + XML
//  structuré EN 16931 / Factur-X (CII). Aucune dépendance serveur.
// =============================================================

export type LigneFacture = {
  libelle: string;
  quantite: number;
  prixUnitaire: number; // € HT
  montantHT: number; // € HT (quantite × prixUnitaire)
};

export type FactureStatut =
  | "BROUILLON" | "EMISE" | "DEPOSEE" | "ENCAISSEE" | "REJETEE" | "REFUSEE" | "AVOIR";
export type Categorie = "BIENS" | "SERVICES" | "MIXTE";

export const STATUT_FACTURE_LABELS: Record<FactureStatut, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  DEPOSEE: "Déposée (PDP)",
  ENCAISSEE: "Encaissée",
  REJETEE: "Rejetée",
  REFUSEE: "Refusée",
  AVOIR: "Avoir",
};

export const CATEGORIE_LABELS: Record<Categorie, string> = {
  BIENS: "Livraison de biens",
  SERVICES: "Prestation de services",
  MIXTE: "Opération mixte (biens et services)",
};

export type PartieFacture = {
  nom: string;
  raisonSociale?: string | null;
  siret?: string | null;
  tva?: string | null; // n° TVA intracommunautaire
  adresse?: string | null;
  codePostal?: string | null;
  ville?: string | null;
  pays?: string | null;
  email?: string | null;
  nda?: string | null;
  representant?: string | null;
};

export type FactureData = {
  numero: string;
  statut: FactureStatut;
  categorie: Categorie;
  periodeDebut: Date;
  periodeFin: Date;
  dateEmission?: Date | null;
  dateEcheance?: Date | null;
  montantHT: number;
  tauxTva: number;
  montantTva: number;
  montantTTC: number;
  lignes: LigneFacture[];
  clientSiren?: string | null;
  adresseLivraison?: string | null;
  optionTvaDebits: boolean;
  modePaiement?: string | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Totaux à partir des lignes HT et du taux de TVA. */
export function calcMontants(lignes: LigneFacture[], tauxTva: number): {
  montantHT: number; montantTva: number; montantTTC: number;
} {
  const montantHT = round2(lignes.reduce((s, l) => s + l.montantHT, 0));
  const montantTva = round2(montantHT * (tauxTva / 100));
  return { montantHT, montantTva, montantTTC: round2(montantHT + montantTva) };
}

/** SIREN (9 chiffres) déduit du SIRET (14 chiffres). */
export function sirenFromSiret(siret?: string | null): string | null {
  const digits = (siret ?? "").replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(0, 9) : null;
}

/**
 * Mentions obligatoires manquantes (réforme 2026 + Code de commerce). Renvoie la
 * liste des libellés absents → l'éditeur sait ce qu'il reste à compléter avant
 * d'émettre/transmettre.
 */
export function mentionsManquantes(opts: {
  emetteur: PartieFacture;
  client: PartieFacture;
  facture: FactureData;
}): string[] {
  const { emetteur, client, facture } = opts;
  const manque: string[] = [];
  if (!sirenFromSiret(emetteur.siret)) manque.push("SIREN/SIRET de l'émetteur");
  if (!emetteur.tva) manque.push("N° TVA intracommunautaire de l'émetteur");
  if (!facture.clientSiren && !sirenFromSiret(client.siret)) manque.push("SIREN du client (obligatoire dès 09/2026)");
  if (!facture.numero) manque.push("Numéro de facture");
  if (!facture.dateEmission) manque.push("Date d'émission");
  if (!facture.lignes.length) manque.push("Au moins une ligne de facturation");
  return manque;
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDate(d?: Date | null): string {
  return d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
}
function fmtCii(d?: Date | null): string {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`;
}
function adresseComplete(p: PartieFacture): string {
  return [p.adresse, [p.codePostal, p.ville].filter(Boolean).join(" "), p.pays].filter(Boolean).join(", ");
}

// ── PDF lisible (HTML → lib/pdf.ts) ─────────────────────────────────────────

/** Gabarit HTML A4 d'une facture éditeur, avec les mentions obligatoires. */
export function factureEditeurHtml(opts: {
  emetteur: PartieFacture;
  client: PartieFacture;
  facture: FactureData;
}): string {
  const { emetteur, client, facture } = opts;
  const clientSiren = facture.clientSiren ?? sirenFromSiret(client.siret) ?? "—";
  const lignes = facture.lignes
    .map(
      (l) => `<tr>
        <td style="padding:6px 8px;border:1px solid #e2e8f0">${esc(l.libelle)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">${l.quantite}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">${esc(euros(l.prixUnitaire))}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">${esc(euros(l.montantHT))}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
    body { font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:#1e293b; font-size:12.5px; margin:0; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #2C53C0; padding-bottom:10px; }
    h1 { font-size:20px; margin:0; }
    .muted { color:#64748b; }
    table { border-collapse:collapse; width:100%; margin-top:8px; font-size:12px; }
    th { background:#f1f5f9; padding:6px 8px; border:1px solid #e2e8f0; text-align:left; }
    .tot td { padding:4px 8px; }
    .mentions { margin-top:16px; font-size:10.5px; color:#64748b; line-height:1.5; border-top:1px solid #e2e8f0; padding-top:8px; }
  </style></head><body>
    <div class="head">
      <div>
        <p style="font-weight:700;font-size:15px;margin:0">${esc(emetteur.raisonSociale || emetteur.nom)}</p>
        <p class="muted" style="margin:2px 0 0">${esc(adresseComplete(emetteur))}</p>
        <p class="muted" style="margin:2px 0 0">SIRET ${esc(emetteur.siret ?? "—")} · TVA ${esc(emetteur.tva ?? "—")}${emetteur.nda ? ` · NDA ${esc(emetteur.nda)}` : ""}</p>
      </div>
      <div style="text-align:right">
        <h1>FACTURE</h1>
        <p style="margin:2px 0 0"><b>${esc(facture.numero)}</b></p>
        <p class="muted" style="margin:2px 0 0">Émise le ${fmtDate(facture.dateEmission)}</p>
        ${facture.dateEcheance ? `<p class="muted" style="margin:2px 0 0">Échéance : ${fmtDate(facture.dateEcheance)}</p>` : ""}
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:14px">
      <div style="font-size:12px">
        <p class="muted" style="margin:0 0 2px;text-transform:uppercase;font-size:10px;letter-spacing:.04em">Facturé à</p>
        <p style="margin:0;font-weight:600">${esc(client.raisonSociale || client.nom)}</p>
        <p class="muted" style="margin:2px 0 0">${esc(adresseComplete(client))}</p>
        <p class="muted" style="margin:2px 0 0">SIREN ${esc(clientSiren)}${client.tva ? ` · TVA ${esc(client.tva)}` : ""}</p>
        ${facture.adresseLivraison ? `<p class="muted" style="margin:2px 0 0">Livraison : ${esc(facture.adresseLivraison)}</p>` : ""}
      </div>
      <div style="font-size:12px;text-align:right">
        <p class="muted" style="margin:0">Catégorie : ${esc(CATEGORIE_LABELS[facture.categorie])}</p>
        <p class="muted" style="margin:2px 0 0">Période : ${fmtDate(facture.periodeDebut)} → ${fmtDate(facture.periodeFin)}</p>
      </div>
    </div>

    <table>
      <thead><tr><th>Désignation</th><th style="text-align:right">Qté</th><th style="text-align:right">PU HT</th><th style="text-align:right">Montant HT</th></tr></thead>
      <tbody>${lignes}</tbody>
    </table>

    <table style="width:280px;margin-left:auto" class="tot">
      <tr><td>Total HT</td><td style="text-align:right">${esc(euros(facture.montantHT))}</td></tr>
      <tr><td>TVA (${facture.tauxTva} %)</td><td style="text-align:right">${esc(euros(facture.montantTva))}</td></tr>
      <tr style="font-weight:700;border-top:2px solid #2C53C0"><td>Total TTC</td><td style="text-align:right">${esc(euros(facture.montantTTC))}</td></tr>
    </table>

    <div class="mentions">
      <p style="margin:0">Mode de paiement : ${esc(facture.modePaiement ?? "—")}.${facture.optionTvaDebits ? " TVA acquittée d'après les débits." : ""}</p>
      <p style="margin:4px 0 0">En cas de retard de paiement : pénalités au taux de 3 fois l'intérêt légal + indemnité forfaitaire de recouvrement de 40 € (art. L441-10 C. com.). Pas d'escompte pour paiement anticipé.</p>
      <p style="margin:4px 0 0">Facture électronique conforme à la norme EN 16931 (format Factur-X). ${facture.statut === "AVOIR" ? "Document : avoir." : ""}</p>
    </div>
  </body></html>`;
}

// ── XML structuré EN 16931 / Factur-X (CII) ─────────────────────────────────

/**
 * Données structurées de la facture au format CII (Cross Industry Invoice,
 * profil EN 16931) — le « cœur » Factur-X à embarquer dans le PDF/A-3 et à
 * transmettre via une PDP (Lot 4c). Profil de base ; à valider avant production.
 */
export function factureCiiXml(opts: {
  emetteur: PartieFacture;
  client: PartieFacture;
  facture: FactureData;
}): string {
  const { emetteur, client, facture } = opts;
  const emetteurSiren = sirenFromSiret(emetteur.siret);
  const clientSiren = facture.clientSiren ?? sirenFromSiret(client.siret);
  const typeCode = facture.statut === "AVOIR" ? "381" : "380"; // 380 facture, 381 avoir
  const m2 = (n: number) => n.toFixed(2);

  const partie = (role: "Seller" | "Buyer", p: PartieFacture, siren: string | null) => `
      <ram:${role}TradeParty>
        <ram:Name>${esc(p.raisonSociale || p.nom)}</ram:Name>
        ${siren ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(siren)}</ram:ID></ram:SpecifiedLegalOrganization>` : ""}
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${esc(p.codePostal ?? "")}</ram:PostcodeCode>
          <ram:LineOne>${esc(p.adresse ?? "")}</ram:LineOne>
          <ram:CityName>${esc(p.ville ?? "")}</ram:CityName>
          <ram:CountryID>${esc((p.pays ?? "FR") === "France" ? "FR" : p.pays ?? "FR")}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${p.tva ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(p.tva)}</ram:ID></ram:SpecifiedTaxRegistration>` : ""}
      </ram:${role}TradeParty>`;

  const lignes = facture.lignes
    .map(
      (l, i) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${i + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${esc(l.libelle)}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${m2(l.prixUnitaire)}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="C62">${l.quantite}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>${m2(facture.tauxTva)}</ram:RateApplicablePercent></ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${m2(l.montantHT)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(facture.numero)}</ram:ID>
    <ram:TypeCode>${typeCode}</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${fmtCii(facture.dateEmission ?? new Date())}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lignes}
    <ram:ApplicableHeaderTradeAgreement>${partie("Seller", emetteur, emetteurSiren)}${partie("Buyer", client, clientSiren)}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${m2(facture.montantTva)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${m2(facture.montantHT)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${m2(facture.tauxTva)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${m2(facture.montantHT)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${m2(facture.montantHT)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${m2(facture.montantTva)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${m2(facture.montantTTC)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${m2(facture.montantTTC)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}
