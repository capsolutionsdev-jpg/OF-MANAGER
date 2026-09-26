import { describe, it, expect } from "vitest";
import { isNonStaffRole, SECTION_ROLES } from "@/lib/permissions";

/**
 * Non-régression BFLA (audit OFM). `isNonStaffRole` est la source unique utilisée
 * par les gardes inline des Server Actions de gestion pour rejeter les rôles qui
 * ont un login mais ne sont pas du personnel (élèves, formateurs, clients B2B).
 */
describe("isNonStaffRole (garde BFLA)", () => {
  it("rejette les rôles NON-staff (dont ENTREPRISE, tiers B2B)", () => {
    expect(isNonStaffRole("APPRENANT")).toBe(true);
    expect(isNonStaffRole("FORMATEUR")).toBe(true);
    expect(isNonStaffRole("ENTREPRISE")).toBe(true);
  });

  it("laisse passer le personnel de gestion", () => {
    expect(isNonStaffRole("ADMIN")).toBe(false);
    expect(isNonStaffRole("RESPONSABLE_FORMATION")).toBe(false);
    expect(isNonStaffRole("ASSISTANT")).toBe(false);
    expect(isNonStaffRole("SUPERADMIN")).toBe(false);
  });

  it("tolère null/undefined (traité comme non pertinent, non 'non-staff')", () => {
    expect(isNonStaffRole(null)).toBe(false);
    expect(isNonStaffRole(undefined)).toBe(false);
  });
});

/**
 * Non-régression : la section STAFF "validations" doit figurer dans SECTION_ROLES,
 * sinon roleAllowedInSection() la considère « non protégée » et canAccessSection()
 * laisse passer les rôles non-staff (cause racine du BFLA validation-actions).
 */
describe("SECTION_ROLES couvre les sections STAFF sensibles", () => {
  it("inclut 'validations' réservé au personnel (sans rôle non-staff)", () => {
    expect(SECTION_ROLES.validations).toBeDefined();
    const roles = SECTION_ROLES.validations;
    expect(roles).toContain("ADMIN");
    expect(roles).not.toContain("ENTREPRISE");
    expect(roles).not.toContain("FORMATEUR");
    expect(roles).not.toContain("APPRENANT");
  });
});
