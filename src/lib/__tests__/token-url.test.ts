import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appBaseUrl } from "@/lib/token";

// appBaseUrl lit process.env à l'appel : on isole l'environnement par test.
const KEYS = ["APP_URL", "AUTH_URL", "NEXTAUTH_URL", "VERCEL"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("appBaseUrl() — liens publics jamais protégés", () => {
  it("utilise APP_URL propre et retire le slash final", () => {
    process.env.APP_URL = "https://ofmanager.info/";
    expect(appBaseUrl()).toBe("https://ofmanager.info");
  });

  it("REFUSE une URL *.vercel.app (mur de connexion) et retombe sur le domaine public en prod", () => {
    process.env.APP_URL = "https://ofmanager-commercial-xyz.vercel.app";
    process.env.VERCEL = "1";
    expect(appBaseUrl()).toBe("https://ofmanager.info");
    expect(appBaseUrl()).not.toContain(".vercel.app");
  });

  it("sur Vercel sans URL explicite → domaine public connu", () => {
    process.env.VERCEL = "1";
    expect(appBaseUrl()).toBe("https://ofmanager.info");
  });

  it("en local (hors Vercel) → localhost", () => {
    expect(appBaseUrl()).toBe("http://localhost:3100");
  });
});
