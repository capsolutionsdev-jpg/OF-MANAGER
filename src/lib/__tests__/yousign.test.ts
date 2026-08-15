import { describe, it, expect, afterEach } from "vitest";
import { yousignConfigured, createYousignRequest } from "@/lib/yousign";

afterEach(() => {
  delete process.env.YOUSIGN_API_KEY;
});

describe("yousign — honnêteté du connecteur (flux v3 non branché)", () => {
  it("yousignConfigured() est faux sans clé", () => {
    delete process.env.YOUSIGN_API_KEY;
    expect(yousignConfigured()).toBe(false);
  });

  it("yousignConfigured() reste faux MÊME avec une clé (flux v3 pas branché)", () => {
    process.env.YOUSIGN_API_KEY = "test-key";
    expect(yousignConfigured()).toBe(false);
  });

  it("createYousignRequest ne renvoie JAMAIS de faux identifiant (toujours mode démo)", async () => {
    process.env.YOUSIGN_API_KEY = "test-key";
    const res = await createYousignRequest({ name: "doc", signers: [{ nom: "X", email: "x@y.fr" }] });
    expect(res.demo).toBe(true);
    expect(res.externalId).toBeNull();
    expect(res.signUrl).toBeNull();
  });

  it("sans clé : mode démo, pas d'identifiant", async () => {
    delete process.env.YOUSIGN_API_KEY;
    const res = await createYousignRequest({ name: "doc", signers: [] });
    expect(res.demo).toBe(true);
    expect(res.externalId).toBeNull();
  });
});
