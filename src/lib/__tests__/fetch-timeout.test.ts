import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

afterEach(() => vi.unstubAllGlobals());

describe("fetchWithTimeout — borne chaque appel sortant (A12-002)", () => {
  it("passe un AbortSignal (timeout) à fetch, forwarde init et renvoie la réponse", async () => {
    const spy = vi.fn(async (_input: unknown, init: RequestInit = {}) => {
      expect(init.signal).toBeInstanceOf(AbortSignal);
      return new Response("ok");
    });
    vi.stubGlobal("fetch", spy);

    const r = await fetchWithTimeout("https://x.test", { method: "POST" }, 5000);

    expect(await r.text()).toBe("ok");
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe("POST");
  });
});
