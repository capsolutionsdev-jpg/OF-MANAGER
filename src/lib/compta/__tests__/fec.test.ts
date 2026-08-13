import { describe, it, expect } from "vitest";
import {
  buildFec, serializeFec, fecFilename, FEC_COLUMNS,
  type FecFacture, type FecPaiement, type FecCharge,
} from "@/lib/compta/fec";

const d = (s: string) => new Date(s + "T00:00:00");

const facture = (over: Partial<FecFacture> = {}): FecFacture => ({
  reference: "F-2026-001", dateEmission: d("2026-03-10"),
  montantHT: 1000, montantTTC: 1200, statut: "ENVOYEE",
  clientId: "ent1", clientNom: "ACME SARL", ...over,
});

describe("buildFec — journal des ventes", () => {
  it("facture avec TVA → 3 lignes équilibrées (411 débit = 706 + 44571 crédit)", () => {
    const { rows, totalDebit, totalCredit } = buildFec({ factures: [facture()], paiements: [], charges: [] });
    expect(rows).toHaveLength(3);
    const client = rows.find((r) => r.CompteNum === "411000")!;
    const vente = rows.find((r) => r.CompteNum === "706000")!;
    const tva = rows.find((r) => r.CompteNum === "445710")!;
    expect(client.Debit).toBe("1200,00");
    expect(vente.Credit).toBe("1000,00");
    expect(tva.Credit).toBe("200,00");
    expect(client.JournalCode).toBe("VE");
    expect(client.CompAuxNum).toBe("ENT1");
    expect(totalDebit).toBe(totalCredit);
  });

  it("facture exonérée de TVA (HT = TTC) → pas de ligne 44571", () => {
    const { rows } = buildFec({ factures: [facture({ montantHT: 500, montantTTC: 500 })], paiements: [], charges: [] });
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.CompteNum === "445710")).toBe(false);
  });

  it("avoir → sens inversé (411 crédit, 706 débit)", () => {
    const { rows, totalDebit, totalCredit } = buildFec({
      factures: [facture({ statut: "AVOIR", reference: "AV-2026-001" })], paiements: [], charges: [],
    });
    const client = rows.find((r) => r.CompteNum === "411000")!;
    const vente = rows.find((r) => r.CompteNum === "706000")!;
    expect(client.Credit).toBe("1200,00");
    expect(vente.Debit).toBe("1000,00");
    expect(client.EcritureLib).toContain("Avoir");
    expect(totalDebit).toBe(totalCredit);
  });

  it("ignore les factures BROUILLON et ANNULEE", () => {
    const { rows } = buildFec({
      factures: [facture({ statut: "BROUILLON" }), facture({ statut: "ANNULEE" })],
      paiements: [], charges: [],
    });
    expect(rows).toHaveLength(0);
  });
});

describe("buildFec — banque & achats", () => {
  it("encaissement → 512 débit / 411 crédit (journal BQ)", () => {
    const p: FecPaiement = {
      date: d("2026-04-01"), montant: 1200, mode: "VIREMENT", reference: null,
      factureRef: "F-2026-001", clientId: "ent1", clientNom: "ACME SARL",
    };
    const { rows, totalDebit, totalCredit } = buildFec({ factures: [], paiements: [p], charges: [] });
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.CompteNum === "512000")!.Debit).toBe("1200,00");
    expect(rows.find((r) => r.CompteNum === "411000")!.Credit).toBe("1200,00");
    expect(rows[0].JournalCode).toBe("BQ");
    expect(totalDebit).toBe(totalCredit);
  });

  it("charge → 6xx débit / 401 crédit (journal AC), compte mappé par catégorie", () => {
    const c: FecCharge = {
      date: d("2026-05-02"), montant: 800, categorie: "LOYER",
      categorieAutre: null, libelle: "Loyer mai", numeroPiece: "Q-42",
    };
    const { rows, totalDebit, totalCredit } = buildFec({ factures: [], paiements: [], charges: [c] });
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.CompteNum === "613200")!.Debit).toBe("800,00");
    expect(rows.find((r) => r.CompteNum === "401000")!.Credit).toBe("800,00");
    expect(rows[0].JournalCode).toBe("AC");
    expect(totalDebit).toBe(totalCredit);
  });

  it("catégorie inconnue → compte 606800 par défaut", () => {
    const c: FecCharge = {
      date: d("2026-05-02"), montant: 50, categorie: "INEXISTANTE",
      categorieAutre: null, libelle: null, numeroPiece: null,
    };
    const { rows } = buildFec({ factures: [], paiements: [], charges: [c] });
    expect(rows.find((r) => Number(r.Debit.replace(",", ".")) > 0)!.CompteNum).toBe("606800");
  });
});

describe("ensemble équilibré + numérotation", () => {
  it("débit total = crédit total sur un mix, EcritureNum unique par pièce", () => {
    const { rows, totalDebit, totalCredit } = buildFec({
      factures: [facture(), facture({ reference: "F-2026-002", montantHT: 300, montantTTC: 300 })],
      paiements: [{ date: d("2026-04-01"), montant: 500, mode: "CB", reference: null, factureRef: null, clientId: null, clientNom: null }],
      charges: [{ date: d("2026-05-01"), montant: 120, categorie: "ADS", categorieAutre: null, libelle: "Pub", numeroPiece: null }],
    });
    expect(totalDebit).toBe(totalCredit);
    // 4 pièces → numéros 1..4
    expect(new Set(rows.map((r) => r.EcritureNum))).toEqual(new Set(["1", "2", "3", "4"]));
  });
});

describe("serializeFec & format", () => {
  it("en-tête = 18 colonnes, chaque ligne = 18 champs, séparateur tabulation, fin CRLF", () => {
    const { rows } = buildFec({ factures: [facture()], paiements: [], charges: [] });
    const txt = serializeFec(rows);
    const lines = txt.replace(/\r\n$/, "").split("\r\n");
    expect(lines[0].split("\t")).toHaveLength(18);
    expect(lines[0].split("\t")[0]).toBe("JournalCode");
    expect(FEC_COLUMNS).toHaveLength(18);
    for (const l of lines.slice(1)) expect(l.split("\t")).toHaveLength(18);
    expect(txt.endsWith("\r\n")).toBe(true);
  });

  it("un libellé contenant une tabulation ne casse pas le fichier", () => {
    const { rows } = buildFec({
      factures: [facture({ clientNom: "ACME\tSARL\nBIS" })], paiements: [], charges: [],
    });
    const txt = serializeFec(rows);
    for (const l of txt.replace(/\r\n$/, "").split("\r\n")) {
      expect(l.split("\t")).toHaveLength(18);
    }
  });
});

describe("fecFilename", () => {
  it("SIREN = 9 premiers chiffres du SIRET + année de clôture", () => {
    expect(fecFilename("123 456 789 00012", 2026)).toBe("123456789FEC20261231.txt");
    expect(fecFilename(null, 2025)).toBe("000000000FEC20251231.txt");
  });
});
