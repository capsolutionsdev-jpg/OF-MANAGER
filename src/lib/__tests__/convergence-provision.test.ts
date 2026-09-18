import { describe, it, expect } from "vitest";
import {
  normalizeSubdomain,
  isValidSubdomainShape,
  validateTenantInput,
  buildOrganismeCreateData,
  ALL_TENANT_FEATURES,
} from "@/lib/convergence/provision-tenant";

describe("normalizeSubdomain", () => {
  it("translittère et nettoie", () => {
    expect(normalizeSubdomain("ASPR Formation")).toBe("aspr-formation");
    expect(normalizeSubdomain("Éà  Test__x")).toBe("ea-test-x");
  });
});

describe("isValidSubdomainShape", () => {
  it("accepte un label normal", () => {
    expect(isValidSubdomainShape("aspr")).toBe(true);
  });
  it("rejette réservé / vide / tout-chiffres", () => {
    expect(isValidSubdomainShape("www")).toBe(false);
    expect(isValidSubdomainShape("")).toBe(false);
    expect(isValidSubdomainShape("123")).toBe(false);
  });
});

describe("validateTenantInput", () => {
  const base = { nom: "ASPR Formation", sousDomaine: "aspr", adminEmail: "admin@aspr.fr", adminNom: "Admin ASPR", formule: "RESEAU" as const };

  it("accepte une entrée valide et normalise", () => {
    const r = validateTenantInput(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.sousDomaine).toBe("aspr");
      expect(r.input.adminEmail).toBe("admin@aspr.fr");
    }
  });

  it("dérive le sous-domaine du nom si absent", () => {
    const r = validateTenantInput({ ...base, sousDomaine: undefined });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.input.sousDomaine).toBe("aspr-formation");
  });

  it("rejette e-mail invalide, formule inconnue, nom vide", () => {
    const r = validateTenantInput({ ...base, adminEmail: "pas-un-email", formule: "GOLD" as never, nom: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes("e-mail"))).toBe(true);
      expect(r.errors.some((e) => e.includes("formule"))).toBe(true);
      expect(r.errors.some((e) => e.includes("nom requis"))).toBe(true);
    }
  });
});

describe("buildOrganismeCreateData", () => {
  it("construit les données de création avec les fonctionnalités", () => {
    const r = validateTenantInput({ nom: "ASPR", sousDomaine: "aspr", adminEmail: "a@b.fr", adminNom: "X", formule: "PRO" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const data = buildOrganismeCreateData(r.input, ALL_TENANT_FEATURES);
    expect(data.statut).toBe("ACTIF");
    expect(data.formule).toBe("PRO");
    expect(data.sousDomaine).toBe("aspr");
    expect(data.email).toBe("a@b.fr");
    expect(data.fonctionnalites.set.length).toBe(ALL_TENANT_FEATURES.length);
  });
});
