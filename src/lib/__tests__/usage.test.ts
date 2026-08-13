import { describe, it, expect } from "vitest";
import { usageStatus } from "@/lib/usage";

describe("usageStatus — quota de volume mensuel", () => {
  it("illimité (limit = null) → jamais near/over", () => {
    expect(usageStatus(10_000, null)).toEqual({ used: 10_000, limit: null, pct: 0, near: false, over: false });
  });

  it("sous le seuil (< 80 %)", () => {
    const m = usageStatus(20, 100);
    expect(m.pct).toBe(20);
    expect(m.near).toBe(false);
    expect(m.over).toBe(false);
  });

  it("proche de la limite (80–99 %) → near", () => {
    const m = usageStatus(85, 100);
    expect(m.near).toBe(true);
    expect(m.over).toBe(false);
  });

  it("à la limite ou au-delà (≥ 100 %) → over", () => {
    expect(usageStatus(100, 100).over).toBe(true);
    const dep = usageStatus(150, 100);
    expect(dep.over).toBe(true);
    expect(dep.near).toBe(false);
    expect(dep.pct).toBe(150);
  });
});
