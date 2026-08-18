import { describe, it, expect } from "vitest";
import { monthKey, computeWaterfall, computeCohorts } from "@/lib/mrr-snapshot";

describe("MRR — clé de mois", () => {
  it("formate AAAA-MM (mois sur 2 chiffres)", () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe("2026-01");
    expect(monthKey(new Date(2026, 11, 1))).toBe("2026-12");
  });
});

describe("MRR — waterfall (new / expansion / contraction / churn)", () => {
  it("classe chaque organisme et net = Σcurr − Σprev", () => {
    const prev = { a: 149, b: 249, c: 79 };
    const curr = { a: 249, c: 49, d: 149 };
    const w = computeWaterfall(prev, curr);
    expect(w.nouveau).toBe(149); // d apparaît
    expect(w.expansion).toBe(100); // a 149 → 249
    expect(w.contraction).toBe(-30); // c 79 → 49
    expect(w.churn).toBe(-249); // b disparaît
    const sum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);
    expect(w.net).toBe(sum(curr) - sum(prev));
    expect(w.net).toBe(-30);
  });

  it("deux mois identiques → net 0", () => {
    expect(computeWaterfall({ a: 100 }, { a: 100 }).net).toBe(0);
  });
});

describe("MRR — cohortes de rétention", () => {
  it("retention = actifs / total du mois d'inscription", () => {
    const now = new Date(2026, 5, 15); // juin 2026
    const orgs = [
      { createdAt: new Date(2026, 5, 2), statut: "ACTIF" },
      { createdAt: new Date(2026, 5, 3), statut: "SUSPENDU" },
      { createdAt: new Date(2026, 4, 10), statut: "ACTIF" },
    ];
    const cohorts = computeCohorts(orgs, now, 2);
    const juin = cohorts.find((c) => c.mois === "2026-06")!;
    expect(juin.total).toBe(2);
    expect(juin.actifs).toBe(1);
    expect(juin.retention).toBe(50);
    const mai = cohorts.find((c) => c.mois === "2026-05")!;
    expect(mai.total).toBe(1);
    expect(mai.retention).toBe(100);
  });

  it("mois sans inscription → rétention 0 (pas de division par zéro)", () => {
    const cohorts = computeCohorts([], new Date(2026, 5, 15), 3);
    expect(cohorts).toHaveLength(3);
    expect(cohorts.every((c) => c.retention === 0 && c.total === 0)).toBe(true);
  });
});
