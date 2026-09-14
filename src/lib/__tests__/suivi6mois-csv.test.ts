import { describe, it, expect } from "vitest";
import { buildSuivi6MoisCsv, type SuiviCsvRow } from "@/lib/suivi6mois-csv";

const row = (over: Partial<SuiviCsvRow> = {}): SuiviCsvRow => ({
  candidat: "Alice Martin",
  email: "alice@example.com",
  formation: "TFP APS",
  dateFin: "15/01/2026",
  echeance: "15/07/2026",
  statut: "Fait",
  envoyeLe: "15/07/2026",
  relanceLe: "",
  relanceCount: 0,
  reponduLe: "20/07/2026",
  situation: "En emploi — CDI",
  lienFormation: "Oui, directement en lien",
  poste: "Agent de sécurité",
  employeur: "SecuCorp",
  apport: "9",
  ...over,
});

describe("buildSuivi6MoisCsv", () => {
  it("commence par un BOM et une ligne d'en-tête", () => {
    const csv = buildSuivi6MoisCsv([row()]);
    expect(csv.startsWith("﻿")).toBe(true);
    const header = csv.replace(/^﻿/, "").split("\r\n")[0];
    expect(header).toContain("Candidat");
    expect(header).toContain("Statut");
    expect(header.split(";").length).toBeGreaterThanOrEqual(10);
  });

  it("sérialise une ligne de données (séparateur point-virgule)", () => {
    const csv = buildSuivi6MoisCsv([row()]);
    const line = csv.replace(/^﻿/, "").split("\r\n")[1];
    expect(line).toContain("Alice Martin");
    expect(line).toContain("TFP APS");
    expect(line).toContain("En emploi — CDI");
  });

  it("échappe les champs contenant un point-virgule ou un guillemet", () => {
    const csv = buildSuivi6MoisCsv([row({ formation: 'Habilitation; niveau "2"' })]);
    const line = csv.replace(/^﻿/, "").split("\r\n")[1];
    expect(line).toContain('"Habilitation; niveau ""2"""');
  });

  it("produit une ligne par inscription", () => {
    const csv = buildSuivi6MoisCsv([row(), row({ candidat: "Bob" })]);
    const lines = csv.replace(/^﻿/, "").split("\r\n");
    expect(lines).toHaveLength(3); // en-tête + 2
  });
});
