import { describe, it, expect } from "vitest";
import { generateTotpSecret, verifyTotp, totpCode } from "@/lib/totp";

describe("TOTP (RFC 6238)", () => {
  it("un code généré est accepté par verifyTotp", () => {
    const s = generateTotpSecret();
    expect(verifyTotp(s, totpCode(s))).toBe(true);
  });

  it("rejette un code erroné", () => {
    const s = generateTotpSecret();
    const bad = totpCode(s) === "000000" ? "111111" : "000000";
    expect(verifyTotp(s, bad)).toBe(false);
  });

  it("rejette un format invalide", () => {
    const s = generateTotpSecret();
    expect(verifyTotp(s, "abc")).toBe(false);
    expect(verifyTotp(s, "12345")).toBe(false);
  });

  it("vecteur de test officiel RFC 6238 (SHA-1, t=59s → 287082)", () => {
    // secret ASCII "12345678901234567890" encodé en base32.
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(totpCode(secret, 59_000)).toBe("287082");
  });
});
