import { describe, it, expect } from "vitest";
import { PUBLIC_API_VERSION, publicJson } from "@/lib/api-version";

describe("publicJson — en-tête de version du contrat public (A12-014)", () => {
  it("expose X-API-Version + CORS + cache par défaut", () => {
    const res = publicJson({ ok: true });
    expect(res.headers.get("X-API-Version")).toBe(PUBLIC_API_VERSION);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Expose-Headers")).toContain("X-API-Version");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage");
  });

  it("cache:false → pas de Cache-Control (ex. réponse 404)", () => {
    const res = publicJson({ formation: null }, { status: 404, cache: false });
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBeNull();
    expect(res.headers.get("X-API-Version")).toBe(PUBLIC_API_VERSION);
  });
});
