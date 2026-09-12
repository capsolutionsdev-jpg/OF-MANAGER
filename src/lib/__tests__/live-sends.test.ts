import { describe, it, expect, afterEach, vi } from "vitest";
import { liveSendsBlocked } from "@/lib/live-sends";

afterEach(() => vi.unstubAllEnvs());

describe("liveSendsBlocked — garde-fou d'envois réels par environnement (A12-008)", () => {
  it("ne bloque pas hors Vercel (VERCEL_ENV absent : local / test / self-host)", () => {
    vi.stubEnv("VERCEL_ENV", "");
    expect(liveSendsBlocked()).toBe(false);
  });

  it("ne bloque pas en production Vercel", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(liveSendsBlocked()).toBe(false);
  });

  it("BLOQUE en preview/staging Vercel (protège les vrais destinataires)", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("EMAIL_LIVE", "");
    expect(liveSendsBlocked()).toBe(true);
  });

  it("ne bloque pas en preview si EMAIL_LIVE=1 (activation explicite)", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("EMAIL_LIVE", "1");
    expect(liveSendsBlocked()).toBe(false);
  });
});
