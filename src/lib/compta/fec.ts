/**
 * Génération du FEC (Fichier des Écritures Comptables) — format normalisé par
 * l'article A47 A-1 du Livre des procédures fiscales (18 colonnes, séparateur
 * tabulation). C'est le fichier que l'administration / l'expert-comptable
 * peuvent importer.
 *
 * ⚠️ OF Manager n'est pas un logiciel comptable : ce FEC est une « pré-compta »
 * fidèle aux données saisies (factures, encaissements, charges). Les numéros de
 * compte ci-dessous sont des valeurs indicatives du Plan Comptable Général ;
 * l'expert-comptable les remappe si besoin. Chaque écriture est équilibrée
 * (débit = crédit).
 *
 * Fonctions pures → testables sans base de données.
 */

/** Les 18 colonnes obligatoires, dans l'ordre imposé. */
export const FEC_COLUMNS = [
  "JournalCode", "JournalLib", "EcritureNum", "EcritureDate", "CompteNum", "CompteLib",
  "CompAuxNum", "CompAuxLib", "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit",
  "EcritureLet", "DateLet", "ValidDate", "Montantdevise", "Idevise",
] as const;

// ── Comptes utilisés (PCG) ─────────────────────────────────────────────
const CPT = {
  CLIENTS: { num: "411000", lib: "Clients" },
  VENTES: { num: "706000", lib: "Prestations de formation" },
  TVA_COLLECTEE: { num: "445710", lib: "TVA collectée" },
  BANQUE: { num: "512000", lib: "Banque" },
  FOURNISSEURS: { num: "401000", lib: "Fournisseurs" },
} as const;

/** Mapping indicatif catégorie de dépense → compte de charge (PCG). */
const CHARGE_ACCOUNTS: Record<string, { num: string; lib: string }> = {
  LOYER: { num: "613200", lib: "Locations immobilières" },
  ELECTRICITE: { num: "606100", lib: "Fournitures non stockables (énergie)" },
  TELEPHONIE: { num: "626000", lib: "Frais postaux et de télécommunications" },
  FORMATEUR: { num: "604000", lib: "Achats de prestations de services" },
  JURY_EXAMEN: { num: "604000", lib: "Achats de prestations de services" },
  JURY_SSIAP: { num: "604000", lib: "Achats de prestations de services" },
  FRAIS_EXAMEN_VTC: { num: "604000", lib: "Achats de prestations de services" },
  VISITE_SITE: { num: "625000", lib: "Déplacements, missions et réceptions" },
  DIPLOME: { num: "606400", lib: "Fournitures administratives" },
  FOURNITURE_BUREAU: { num: "606400", lib: "Fournitures administratives" },
  ADS: { num: "623000", lib: "Publicité, publications, relations publiques" },
  FOURNITURE_ALIMENTAIRE: { num: "606300", lib: "Fournitures d'entretien et petit équipement" },
  CARBURANT: { num: "606150", lib: "Carburants" },
  AUTRE: { num: "606800", lib: "Autres achats et charges externes" },
};

// ── Entrées attendues (déjà « aplaties » depuis Prisma) ────────────────
export type FecFacture = {
  reference: string;
  dateEmission: Date;
  montantHT: number;
  montantTTC: number;
  statut: string; // FactureStatut
  clientId: string | null;
  clientNom: string | null;
};
export type FecPaiement = {
  date: Date;
  montant: number;
  mode: string | null;
  reference: string | null;
  factureRef: string | null;
  clientId: string | null;
  clientNom: string | null;
};
export type FecCharge = {
  date: Date;
  montant: number;
  categorie: string;
  categorieAutre: string | null;
  libelle: string | null;
  numeroPiece: string | null;
};

export type FecRow = Record<(typeof FEC_COLUMNS)[number], string>;
export type FecResult = { rows: FecRow[]; totalDebit: number; totalCredit: number };

// ── Helpers de format ──────────────────────────────────────────────────
const ymd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
/** Montant → "1234,56" (virgule décimale, 2 déc., pas de séparateur de milliers). */
const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");
/** Nettoie un libellé : ni tabulation ni retour ligne (casseraient le fichier). */
const clean = (s: string | null | undefined) => (s ?? "").replace(/[\t\r\n]+/g, " ").trim();
/** Code auxiliaire à partir d'un id/nom client (majuscules, alphanum, max 17). */
const auxNum = (id: string | null, nom: string | null) => {
  const base = (id || nom || "DIVERS").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);
  return base || "DIVERS";
};

function emptyRow(): FecRow {
  return Object.fromEntries(FEC_COLUMNS.map((c) => [c, ""])) as FecRow;
}

/** Une ligne d'écriture. `debit`/`credit` en nombre ; l'autre colonne = "0,00". */
function line(base: Partial<FecRow>, debit: number, credit: number): FecRow {
  return { ...emptyRow(), ...base, Debit: money(debit), Credit: money(credit) };
}

/**
 * Construit toutes les écritures FEC à partir des factures, encaissements et
 * charges d'un exercice. `EcritureNum` est un compteur global (unique par
 * écriture) ; les lignes d'une même pièce le partagent.
 */
export function buildFec(input: {
  factures: FecFacture[];
  paiements: FecPaiement[];
  charges: FecCharge[];
}): FecResult {
  const rows: FecRow[] = [];
  let num = 0;

  // ── Journal des ventes (VE) : factures ────────────────────────────────
  const factures = [...input.factures]
    .filter((f) => !["BROUILLON", "ANNULEE"].includes(f.statut))
    .sort((a, b) => +a.dateEmission - +b.dateEmission);
  for (const f of factures) {
    num += 1;
    const avoir = f.statut === "AVOIR";
    const ttc = Math.abs(f.montantTTC);
    const ht = Math.abs(f.montantHT);
    const tva = Math.round((ttc - ht) * 100) / 100;
    const d = ymd(f.dateEmission);
    const base = {
      JournalCode: "VE", JournalLib: "Ventes",
      EcritureNum: String(num), EcritureDate: d,
      PieceRef: clean(f.reference), PieceDate: d,
      EcritureLib: clean(`${avoir ? "Avoir" : "Facture"} ${f.reference}${f.clientNom ? " — " + f.clientNom : ""}`),
      ValidDate: d,
    };
    // Client (411) : débit si facture, crédit si avoir
    rows.push(line(
      { ...base, CompteNum: CPT.CLIENTS.num, CompteLib: CPT.CLIENTS.lib,
        CompAuxNum: auxNum(f.clientId, f.clientNom), CompAuxLib: clean(f.clientNom) || "Clients divers" },
      avoir ? 0 : ttc, avoir ? ttc : 0,
    ));
    // Produit (706) : crédit si facture, débit si avoir
    rows.push(line(
      { ...base, CompteNum: CPT.VENTES.num, CompteLib: CPT.VENTES.lib },
      avoir ? ht : 0, avoir ? 0 : ht,
    ));
    // TVA collectée (44571) : seulement si TVA non nulle (OF souvent exonérés)
    if (tva > 0) {
      rows.push(line(
        { ...base, CompteNum: CPT.TVA_COLLECTEE.num, CompteLib: CPT.TVA_COLLECTEE.lib },
        avoir ? tva : 0, avoir ? 0 : tva,
      ));
    }
  }

  // ── Journal de banque (BQ) : encaissements clients ────────────────────
  const paiements = [...input.paiements].sort((a, b) => +a.date - +b.date);
  for (const p of paiements) {
    const montant = Math.abs(p.montant);
    if (montant === 0) continue;
    num += 1;
    const d = ymd(p.date);
    const ref = clean(p.reference || p.factureRef || "REG");
    const base = {
      JournalCode: "BQ", JournalLib: "Banque",
      EcritureNum: String(num), EcritureDate: d,
      PieceRef: ref, PieceDate: d,
      EcritureLib: clean(`Règlement${p.mode ? " " + p.mode : ""}${p.factureRef ? " facture " + p.factureRef : ""}`),
      ValidDate: d,
    };
    // Banque (512) au débit
    rows.push(line({ ...base, CompteNum: CPT.BANQUE.num, CompteLib: CPT.BANQUE.lib }, montant, 0));
    // Client (411) au crédit (solde de sa créance)
    rows.push(line(
      { ...base, CompteNum: CPT.CLIENTS.num, CompteLib: CPT.CLIENTS.lib,
        CompAuxNum: auxNum(p.clientId, p.clientNom), CompAuxLib: clean(p.clientNom) || "Clients divers" },
      0, montant,
    ));
  }

  // ── Journal des achats (AC) : charges du centre ───────────────────────
  const charges = [...input.charges].sort((a, b) => +a.date - +b.date);
  for (const c of charges) {
    const montant = Math.abs(c.montant);
    if (montant === 0) continue;
    num += 1;
    const d = ymd(c.date);
    const cpt = CHARGE_ACCOUNTS[c.categorie] ?? CHARGE_ACCOUNTS.AUTRE;
    const lib = clean(c.libelle || c.categorieAutre || cpt.lib);
    const ref = clean(c.numeroPiece || "ACHAT");
    const base = {
      JournalCode: "AC", JournalLib: "Achats",
      EcritureNum: String(num), EcritureDate: d,
      PieceRef: ref, PieceDate: d,
      EcritureLib: lib, ValidDate: d,
    };
    // Charge (6xx) au débit
    rows.push(line({ ...base, CompteNum: cpt.num, CompteLib: cpt.lib }, montant, 0));
    // Fournisseurs (401) au crédit
    rows.push(line({ ...base, CompteNum: CPT.FOURNISSEURS.num, CompteLib: CPT.FOURNISSEURS.lib }, 0, montant));
  }

  const totalDebit = rows.reduce((s, r) => s + Number(r.Debit.replace(",", ".")), 0);
  const totalCredit = rows.reduce((s, r) => s + Number(r.Credit.replace(",", ".")), 0);
  return { rows, totalDebit: Math.round(totalDebit * 100) / 100, totalCredit: Math.round(totalCredit * 100) / 100 };
}

/** Sérialise les lignes en texte FEC (en-tête + lignes, tabulations, CRLF). */
export function serializeFec(rows: FecRow[]): string {
  const header = FEC_COLUMNS.join("\t");
  const body = rows.map((r) => FEC_COLUMNS.map((c) => r[c]).join("\t"));
  return [header, ...body].join("\r\n") + "\r\n";
}

/** Nom de fichier réglementaire : <SIREN>FEC<AAAAMMJJ de clôture>.txt */
export function fecFilename(siret: string | null | undefined, year: number): string {
  const siren = (siret ?? "").replace(/\D/g, "").slice(0, 9) || "000000000";
  return `${siren}FEC${year}1231.txt`;
}
