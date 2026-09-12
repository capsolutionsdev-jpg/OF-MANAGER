import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
    constructor(_opts: unknown) {}
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { organisme: { findUnique: vi.fn(async () => null) } },
}));
vi.mock("@/lib/crypto", () => ({ decryptSecret: (v: unknown) => (v ? String(v) : undefined) }));
const reportError = vi.fn();
vi.mock("@/lib/observability/report-error", () => ({
  reportError: (...a: unknown[]) => reportError(...a),
}));

import { aiComplete } from "@/lib/ai";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe("aiComplete — connecteur IA (A12-012)", () => {
  it("mode démo (aucun appel) si aucune clé configurée", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const r = await aiComplete({ prompt: "x" });
    expect(r.ok).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("renvoie le texte concaténé quand l'appel réussit", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    create.mockResolvedValue({ content: [{ type: "text", text: "Bonjour" }, { type: "text", text: "!" }] });
    const r = await aiComplete({ prompt: "x" });
    expect(r).toEqual({ ok: true, text: "Bonjour\n!" });
  });

  it("échec fournisseur → {ok:false} générique (pas de fuite) + reportError", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    create.mockRejectedValue(new Error("boom détails techniques secrets"));
    const r = await aiComplete({ prompt: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).not.toContain("boom");
    expect(reportError).toHaveBeenCalled();
  });
});
