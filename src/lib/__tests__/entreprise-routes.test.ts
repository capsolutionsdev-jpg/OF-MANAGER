import { describe, it, expect } from "vitest";
import { isEntrepriseAllowedPath } from "@/lib/entreprise-routes";

describe("isEntrepriseAllowedPath (confinement espace entreprise)", () => {
  it("autorise l'espace entreprise", () => {
    expect(isEntrepriseAllowedPath("/espace-entreprise")).toBe(true);
    expect(isEntrepriseAllowedPath("/espace-entreprise/documents")).toBe(true);
  });
  it("bloque le back-office et les autres espaces", () => {
    for (const p of ["/dashboard", "/sessions", "/clients-pro", "/mon-espace", "/console", "/administration"]) {
      expect(isEntrepriseAllowedPath(p)).toBe(false);
    }
  });
});
