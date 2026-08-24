import { describe, it, expect } from "vitest";
import { parsePiecesAttendues, mergeDossier, dossierProgress, estPieceAttendue, type PieceDeposee } from "@/lib/dossier/etat";

const ATTENDUES = [
  "CNI / Passeport / Carte de séjour",
  "1 photo d'identité (facultative)",
  "Autorisation préalable CNAPS (ou carte professionnelle valide)",
];

describe("parsePiecesAttendues()", () => {
  it("détecte les pièces facultatives", () => {
    const r = parsePiecesAttendues(ATTENDUES);
    expect(r[0].obligatoire).toBe(true);
    expect(r[1].obligatoire).toBe(false);
    expect(r[2].obligatoire).toBe(true);
  });
});

describe("mergeDossier()", () => {
  it("A_FOURNIR quand aucune pièce déposée", () => {
    expect(mergeDossier(ATTENDUES, []).map((e) => e.statut)).toEqual(["A_FOURNIR", "A_FOURNIR", "A_FOURNIR"]);
  });
  it("fusionne par libellé (label = pièce attendue)", () => {
    const dep: PieceDeposee[] = [
      { id: "p1", label: "CNI / Passeport / Carte de séjour", url: "u1", statut: "VALIDEE", motifRefus: null },
      { id: "p3", label: "Autorisation préalable CNAPS (ou carte professionnelle valide)", url: "u3", statut: "REFUSEE", motifRefus: "Illisible" },
    ];
    const etats = mergeDossier(ATTENDUES, dep);
    expect(etats[0].statut).toBe("VALIDEE");
    expect(etats[0].pieceId).toBe("p1");
    expect(etats[2].statut).toBe("REFUSEE");
    expect(etats[2].motifRefus).toBe("Illisible");
  });
});

describe("dossierProgress()", () => {
  it("avancement sur les OBLIGATOIRES (validées)", () => {
    const dep: PieceDeposee[] = [{ id: "p1", label: "CNI / Passeport / Carte de séjour", url: "u", statut: "VALIDEE", motifRefus: null }];
    const p = dossierProgress(mergeDossier(ATTENDUES, dep));
    expect(p.obligatoires).toBe(2);
    expect(p.validees).toBe(1);
    expect(p.manquantesObligatoires).toBe(1);
    expect(p.complet).toBe(false);
    expect(p.pct).toBe(50);
  });
  it("déposé mais non validé ne complète pas", () => {
    const dep: PieceDeposee[] = [
      { id: "p1", label: "CNI / Passeport / Carte de séjour", url: "u", statut: "EN_ATTENTE", motifRefus: null },
      { id: "p3", label: "Autorisation préalable CNAPS (ou carte professionnelle valide)", url: "u", statut: "EN_ATTENTE", motifRefus: null },
    ];
    const p = dossierProgress(mergeDossier(ATTENDUES, dep));
    expect(p.fournies).toBe(2);
    expect(p.manquantesObligatoires).toBe(0);
    expect(p.complet).toBe(false);
  });
  it("complet quand toutes les obligatoires validées (facultative ignorée)", () => {
    const dep: PieceDeposee[] = [
      { id: "p1", label: "CNI / Passeport / Carte de séjour", url: "u", statut: "VALIDEE", motifRefus: null },
      { id: "p3", label: "Autorisation préalable CNAPS (ou carte professionnelle valide)", url: "u", statut: "VALIDEE", motifRefus: null },
    ];
    const p = dossierProgress(mergeDossier(ATTENDUES, dep));
    expect(p.complet).toBe(true);
    expect(p.pct).toBe(100);
  });
});

describe("estPieceAttendue()", () => {
  it("appartenance exacte (anti-injection de libellé)", () => {
    expect(estPieceAttendue(ATTENDUES, "CNI / Passeport / Carte de séjour")).toBe(true);
    expect(estPieceAttendue(ATTENDUES, "Pièce forgée")).toBe(false);
  });
});
