import { describe, it, expect } from "vitest";
import { generateExpiringToken, expiringTokenExpired, LINK_TTL_DAYS } from "@/lib/token";

const DAY = 24 * 60 * 60 * 1000;

describe("generateExpiringToken / expiringTokenExpired (§magic-links TTL)", () => {
  it("génère un jeton horodaté au format <aléatoire>~<base36>", () => {
    const t = generateExpiringToken();
    expect(t).toContain("~");
    const [rand, stamp] = t.split("~");
    expect(rand.length).toBeGreaterThanOrEqual(32);
    expect(Number.isFinite(parseInt(stamp, 36))).toBe(true);
  });

  it("un jeton fraîchement émis n'est pas expiré", () => {
    expect(expiringTokenExpired(generateExpiringToken(), 60)).toBe(false);
  });

  it("expire strictement au-delà du TTL (ancré sur l'émission)", () => {
    const now = 1_700_000_000_000;
    const emis = (msAgo: number) => `randompart~${(now - msAgo).toString(36)}`;
    expect(expiringTokenExpired(emis(61 * DAY), 60, now)).toBe(true);
    expect(expiringTokenExpired(emis(59 * DAY), 60, now)).toBe(false);
  });

  it("jeton LEGACY (sans ~) = jamais expiré (aucun lien distribué ne casse)", () => {
    expect(expiringTokenExpired("abcdef0123456789ABCDEF", 60)).toBe(false);
  });

  it("horodatage illisible = non bloquant", () => {
    expect(expiringTokenExpired("abc~!!!", 1)).toBe(false);
  });

  it("expose la politique de durées", () => {
    expect(LINK_TTL_DAYS.SIGNATURE).toBe(60);
    expect(LINK_TTL_DAYS.SURVEY).toBe(180);
  });
});
