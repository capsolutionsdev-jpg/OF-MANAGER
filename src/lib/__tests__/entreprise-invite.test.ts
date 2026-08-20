import { describe, it, expect } from "vitest";
import { inviteTokenExpired, INVITE_TTL_DAYS } from "@/lib/entreprise-invite";

describe("inviteTokenExpired", () => {
  const now = new Date("2026-08-20T12:00:00Z").getTime();
  it("TTL = 7 jours", () => expect(INVITE_TTL_DAYS).toBe(7));
  it("expiry nul → expiré (jeton absent/consommé)", () => {
    expect(inviteTokenExpired(null, now)).toBe(true);
  });
  it("expiry futur → non expiré", () => {
    expect(inviteTokenExpired(new Date(now + 1000), now)).toBe(false);
  });
  it("expiry passé → expiré", () => {
    expect(inviteTokenExpired(new Date(now - 1000), now)).toBe(true);
  });
});
