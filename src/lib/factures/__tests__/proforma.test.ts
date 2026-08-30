import { describe, it, expect } from "vitest";
import { buildSessionProformas, type ProformaInscription } from "@/lib/factures/proforma";

const base = (o: Partial<ProformaInscription>): ProformaInscription => ({
  inscriptionId: "i1",
  candidatNom: "Jean Dupont",
  candidatEmail: "jean@ex.fr",
  montant: 500,
  facturesTtc: 0,
  entrepriseId: null,
  entrepriseNom: null,
  entrepriseSiret: null,
  entrepriseEmail: null,
  conventionId: null,
  conventionRef: null,
  ...o,
});

const DESIGNATION = "SSIAP 1 (du 12/03 au 16/03)";

describe("buildSessionProformas", () => {
  it("particulier → 1 proforma par candidat", () => {
    const cibles = buildSessionProformas({
      designation: DESIGNATION,
      assujettiTva: true,
      inscriptions: [base({ inscriptionId: "i1" }), base({ inscriptionId: "i2", candidatNom: "Marie Curie" })],
    });
    expect(cibles).toHaveLength(2);
    expect(cibles.map((c) => c.type)).toEqual(["particulier", "particulier"]);
    expect(cibles[0].key).toBe("candidat:i1");
    expect(cibles[0].clientNom).toBe("Jean Dupont");
    expect(cibles[0].nbCandidats).toBe(1);
    expect(cibles[0].montantHT).toBe(500);
    expect(cibles[0].montantTTC).toBe(600); // TVA 20 %
  });

  it("entreprise avec convention → 1 proforma groupée (1 ligne/candidat + total)", () => {
    const ent = { entrepriseId: "e1", entrepriseNom: "ACME", entrepriseSiret: "123", entrepriseEmail: "rh@acme.fr", conventionId: "c1", conventionRef: "CONV-2026-007" };
    const cibles = buildSessionProformas({
      designation: DESIGNATION,
      assujettiTva: true,
      inscriptions: [
        base({ inscriptionId: "i1", candidatNom: "A A", montant: 500, ...ent }),
        base({ inscriptionId: "i2", candidatNom: "B B", montant: 700, ...ent }),
      ],
    });
    expect(cibles).toHaveLength(1);
    const c = cibles[0];
    expect(c.key).toBe("convention:c1");
    expect(c.type).toBe("entreprise");
    expect(c.clientNom).toBe("ACME");
    expect(c.conventionRef).toBe("CONV-2026-007");
    expect(c.sansConvention).toBe(false);
    expect(c.nbCandidats).toBe(2);
    expect(c.lignes).toHaveLength(2);
    expect(c.lignes[0].libelle).toContain("A A");
    expect(c.montantHT).toBe(1200);
    expect(c.montantTTC).toBe(1440);
  });

  it("entreprise SANS convention → repli 1 proforma/candidat, signalé", () => {
    const cibles = buildSessionProformas({
      designation: DESIGNATION,
      assujettiTva: true,
      inscriptions: [base({ inscriptionId: "i1", candidatNom: "A A", entrepriseId: "e1", entrepriseNom: "ACME", conventionId: null })],
    });
    expect(cibles).toHaveLength(1);
    expect(cibles[0].type).toBe("entreprise");
    expect(cibles[0].sansConvention).toBe(true);
    expect(cibles[0].clientNom).toBe("ACME");
    expect(cibles[0].key).toBe("candidat:i1");
  });

  it("organisme non assujetti TVA → exonération art. 261-4-4° du CGI", () => {
    const [c] = buildSessionProformas({
      designation: DESIGNATION,
      assujettiTva: false,
      inscriptions: [base({ montant: 500 })],
    });
    expect(c.tauxTva).toBe(0);
    expect(c.exonere).toBe(true);
    expect(c.montantTTC).toBe(500); // pas de TVA
    expect(c.mentionTva).toContain("261-4-4");
  });

  it("montant nul sur l'inscription → reste dû = factures déjà émises (montantDu)", () => {
    const [c] = buildSessionProformas({
      designation: DESIGNATION,
      assujettiTva: true,
      inscriptions: [base({ montant: null, facturesTtc: 300 })],
    });
    expect(c.montantHT).toBe(300);
  });

  it("mélange particuliers + B2B groupé sur une même session", () => {
    const cibles = buildSessionProformas({
      designation: DESIGNATION,
      assujettiTva: true,
      inscriptions: [
        base({ inscriptionId: "p1", candidatNom: "Part One" }),
        base({ inscriptionId: "e1", candidatNom: "Emp One", entrepriseId: "E", entrepriseNom: "ACME", conventionId: "c1", conventionRef: "CONV-1" }),
        base({ inscriptionId: "e2", candidatNom: "Emp Two", entrepriseId: "E", entrepriseNom: "ACME", conventionId: "c1", conventionRef: "CONV-1" }),
      ],
    });
    // 1 particulier + 1 convention groupée (2 salariés) = 2 cibles
    expect(cibles).toHaveLength(2);
    expect(cibles.find((c) => c.key === "candidat:p1")).toBeTruthy();
    const conv = cibles.find((c) => c.key === "convention:c1");
    expect(conv?.nbCandidats).toBe(2);
  });
});
