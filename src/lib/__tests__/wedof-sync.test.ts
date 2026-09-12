import { describe, it, expect } from "vitest";
import { wedofOrderedWhere } from "@/lib/wedof-sync";

describe("wedofOrderedWhere — garde anti-régression d'ordre Wedof (A12-006)", () => {
  it("sans horodatage entrant : cible par wedofId seul (impossible d'ordonner → on applique)", () => {
    expect(wedofOrderedWhere("w1", null)).toEqual({ wedofId: "w1" });
  });

  it("avec horodatage : n'autorise l'écrasement que si le stocké est null ou <= entrant", () => {
    const d = new Date("2026-02-01T00:00:00Z");
    expect(wedofOrderedWhere("w1", d)).toEqual({
      wedofId: "w1",
      OR: [{ wedofMajLe: null }, { wedofMajLe: { lte: d } }],
    });
  });
});
