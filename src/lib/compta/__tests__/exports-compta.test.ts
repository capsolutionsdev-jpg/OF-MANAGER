import { describe, it, expect } from "vitest";
import { buildFec, type FecFacture } from "@/lib/compta/fec";
import { ecrituresToCsv, ecrituresFilename } from "@/lib/compta/exports-compta";

const facture: FecFacture = {
  reference: "F-2026-001", dateEmission: new Date(2026, 2, 10), // 10 mars 2026
  montantHT: 1000, montantTTC: 1200, statut: "ENVOYEE",
  clientId: "ent1", clientNom: "ACME SARL",
};
const { rows } = buildFec({ factures: [facture], paiements: [], charges: [] });

const lines = (csv: string) => csv.replace(/^﻿/, "").replace(/\r\n$/, "").split("\r\n");

describe("ecrituresToCsv — tableur", () => {
  const csv = ecrituresToCsv(rows, "tableur");
  it("commence par un BOM (Excel)", () => {
    expect(csv.startsWith("﻿")).toBe(true);
  });
  it("en-tête FR, séparateur point-virgule", () => {
    expect(lines(csv)[0]).toBe("Journal;Date;Compte;Libellé compte;Compte auxiliaire;N° pièce;Libellé écriture;Débit;Crédit");
  });
  it("date FR et montant à virgule", () => {
    const client = lines(csv).find((l) => l.includes("411000"))!;
    const cells = client.split(";");
    expect(cells[1]).toBe("10/03/2026");
    expect(cells[7]).toBe("1200,00"); // débit client
  });
});

describe("ecrituresToCsv — pennylane", () => {
  const csv = ecrituresToCsv(rows, "pennylane");
  it("pas de BOM, en-tête en anglais, séparateur virgule", () => {
    expect(csv.startsWith("﻿")).toBe(false);
    expect(lines(csv)[0]).toBe("journal,date,account_number,account_name,auxiliary_account,piece_reference,label,debit,credit");
  });
  it("date ISO et montant à point", () => {
    const vente = lines(csv).find((l) => l.includes("706000"))!;
    const cells = vente.split(",");
    expect(cells[1]).toBe("2026-03-10");
    expect(cells[8]).toBe("1000.00"); // crédit vente
  });
});

describe("ecrituresToCsv — cegid (date compacte)", () => {
  it("garde la date AAAAMMJJ", () => {
    const csv = ecrituresToCsv(rows, "cegid");
    const l = lines(csv).find((x) => x.includes("411000"))!;
    expect(l.split(";")[1]).toBe("20260310");
  });
});

describe("échappement CSV", () => {
  it("un libellé contenant le séparateur est mis entre guillemets", () => {
    const f: FecFacture = { ...facture, clientNom: "ACME; SARL" };
    const { rows: r } = buildFec({ factures: [f], paiements: [], charges: [] });
    const csv = ecrituresToCsv(r, "tableur");
    // le libellé écriture contient "ACME; SARL" → doit être quoté
    expect(csv).toContain('"');
    // chaque ligne garde le bon nombre de colonnes (9) malgré le ; interne
    for (const l of lines(csv)) {
      // parse simple respectant les guillemets
      const cols = l.match(/("([^"]|"")*"|[^;]*)(;|$)/g)!.filter((x) => x !== "");
      expect(cols.length).toBe(9);
    }
  });
});

describe("ecrituresFilename", () => {
  it("nomme le fichier par logiciel + année", () => {
    expect(ecrituresFilename("pennylane", 2026)).toBe("ecritures-pennylane-2026.csv");
  });
});
