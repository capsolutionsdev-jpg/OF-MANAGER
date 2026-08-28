import { describe, it, expect } from "vitest";
import { montantDu } from "@/lib/comptabilite/montant-du";

describe("montantDu() — dû d'une inscription, règle unique (A06-022)", () => {
  it("prend le montant saisi s'il existe (0 € inclus)", () => {
    expect(montantDu(500, 999)).toBe(500);
    expect(montantDu(0, 999)).toBe(0); // 0 est un montant valide, pas un fallback
  });
  it("retombe sur la somme des factures TTC si le montant est absent", () => {
    expect(montantDu(null, 250)).toBe(250);
    expect(montantDu(null, 0)).toBe(0);
  });
});
