import { describe, it, expect } from "vitest";
import { computeDemoState, formatDemoLeft } from "@/lib/demo/lifecycle";

const NOW = new Date("2026-08-09T12:00:00.000Z");
const inHours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000);

describe("computeDemoState()", () => {
  it("ignore un organisme non-démo", () => {
    const s = computeDemoState(
      { isDemo: false, demoFirstLoginAt: null, demoExpiresAt: null, demoHardExpiresAt: null },
      NOW,
    );
    expect(s).toEqual({ isDemo: false, started: false, expired: false, msLeft: null });
  });

  it("démo créée mais jamais connectée : non démarrée, non expirée, compte sur le filet dur", () => {
    const s = computeDemoState(
      { isDemo: true, demoFirstLoginAt: null, demoExpiresAt: null, demoHardExpiresAt: inDays(7) },
      NOW,
    );
    expect(s.isDemo).toBe(true);
    expect(s.started).toBe(false);
    expect(s.expired).toBe(false);
    expect(s.msLeft).toBe(7 * 86_400_000);
  });

  it("démo active (48 h non écoulées) : non expirée, temps restant sur demoExpiresAt", () => {
    const s = computeDemoState(
      { isDemo: true, demoFirstLoginAt: inHours(-1), demoExpiresAt: inHours(47), demoHardExpiresAt: inDays(7) },
      NOW,
    );
    expect(s.started).toBe(true);
    expect(s.expired).toBe(false);
    expect(s.msLeft).toBe(47 * 3_600_000);
  });

  it("démo dont les 48 h sont écoulées : expirée", () => {
    const s = computeDemoState(
      { isDemo: true, demoFirstLoginAt: inHours(-49), demoExpiresAt: inHours(-1), demoHardExpiresAt: inDays(5) },
      NOW,
    );
    expect(s.expired).toBe(true);
    expect(s.msLeft).toBe(0); // borné à 0
  });

  it("filet dur dépassé : expirée même si demoExpiresAt est dans le futur", () => {
    const s = computeDemoState(
      { isDemo: true, demoFirstLoginAt: inHours(-1), demoExpiresAt: inHours(10), demoHardExpiresAt: inHours(-1) },
      NOW,
    );
    expect(s.expired).toBe(true);
  });
});

describe("formatDemoLeft()", () => {
  it("formate heures + minutes", () => {
    expect(formatDemoLeft(47 * 3_600_000 + 30 * 60_000)).toBe("47 h 30 min");
    expect(formatDemoLeft(2 * 3_600_000)).toBe("2 h");
  });
  it("formate les minutes seules (au moins 1)", () => {
    expect(formatDemoLeft(8 * 60_000)).toBe("8 min");
    expect(formatDemoLeft(10_000)).toBe("1 min");
  });
  it("chaîne vide si null", () => {
    expect(formatDemoLeft(null)).toBe("");
  });
});
