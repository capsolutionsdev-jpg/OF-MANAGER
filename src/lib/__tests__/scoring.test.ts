import { describe, it, expect } from "vitest";
import { scoreCandidat } from "@/lib/scoring";

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe("scoreCandidat()", () => {
  it("note un prospect chaud très haut", () => {
    const r = scoreCandidat({
      email: "a@b.fr",
      telephone: "0612345678",
      financementType: "CPF",
      valeurEstimee: 3000,
      crmStage: "NEGOCIATION",
      relanceDate: daysAhead(2),
      prospectFormCompletedAt: now,
      interactionsCount: 5,
      tags: ["prioritaire"],
      createdAt: now,
    });
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.segment).toBe("chaud");
  });

  it("note un prospect froid bas", () => {
    const r = scoreCandidat({
      crmStage: "NOUVEAU",
      createdAt: daysAgo(200), // ancien → malus
    });
    expect(r.score).toBeLessThan(30);
    expect(r.segment).toBe("froid");
  });

  it("plafonne le score à 100", () => {
    const r = scoreCandidat({
      email: "a@b.fr",
      telephone: "0612345678",
      financementType: "CPF",
      valeurEstimee: 1_000_000,
      crmStage: "GAGNE",
      relanceDate: daysAhead(1),
      prospectFormCompletedAt: now,
      interactionsCount: 50,
      tags: ["a", "b"],
      createdAt: now,
    });
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("classe en tiède entre 30 et 59", () => {
    const r = scoreCandidat({
      email: "a@b.fr", // +10
      telephone: "0612345678", // +15
      crmStage: "NOUVEAU", // +5
      createdAt: daysAgo(30), // ni récent ni ancien
    });
    expect(r.score).toBe(30);
    expect(r.segment).toBe("tiede");
  });
});
