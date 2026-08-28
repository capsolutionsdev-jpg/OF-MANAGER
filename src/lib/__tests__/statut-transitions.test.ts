import { describe, it, expect } from "vitest";
import {
  canSetFactureEditeurStatut,
  canSetDevisStatut,
  canEditSession,
} from "@/lib/statut-transitions";

describe("transitions de statut — gardes conservatrices (A06-011)", () => {
  it("facture éditeur : émise/encaissée ne revient jamais en BROUILLON", () => {
    expect(canSetFactureEditeurStatut("EMISE", "BROUILLON")).toBe(false);
    expect(canSetFactureEditeurStatut("ENCAISSEE", "BROUILLON")).toBe(false);
    expect(canSetFactureEditeurStatut("DEPOSEE", "BROUILLON")).toBe(false);
    // Transitions légitimes conservées
    expect(canSetFactureEditeurStatut("BROUILLON", "BROUILLON")).toBe(true);
    expect(canSetFactureEditeurStatut("EMISE", "ENCAISSEE")).toBe(true);
    expect(canSetFactureEditeurStatut("EMISE", "DEPOSEE")).toBe(true);
  });

  it("devis : un devis payé/partiel/annulé ne revient pas en BROUILLON", () => {
    expect(canSetDevisStatut("PAYEE", "BROUILLON")).toBe(false);
    expect(canSetDevisStatut("PARTIELLE", "BROUILLON")).toBe(false);
    expect(canSetDevisStatut("ANNULEE", "BROUILLON")).toBe(false);
    // Un devis envoyé peut être ramené en brouillon (correction avant paiement)
    expect(canSetDevisStatut("ENVOYEE", "BROUILLON")).toBe(true);
    expect(canSetDevisStatut("ENVOYEE", "PAYEE")).toBe(true);
  });

  it("session : une session terminée ou annulée n'est plus éditable", () => {
    expect(canEditSession("TERMINEE")).toBe(false);
    expect(canEditSession("ANNULEE")).toBe(false);
    expect(canEditSession("EN_COURS")).toBe(true);
    expect(canEditSession("PLANIFIEE")).toBe(true);
  });
});
