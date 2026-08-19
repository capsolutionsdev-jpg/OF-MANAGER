import { describe, it, expect } from "vitest";
import { requires2faEnrollment, ROLES_2FA_OBLIGATOIRE } from "@/lib/security/mandatory-2fa";

describe("requires2faEnrollment (§11 — 2FA obligatoire admins)", () => {
  it("force l'enrôlement pour un ADMIN sans 2FA", () => {
    expect(requires2faEnrollment("ADMIN", false)).toBe(true);
  });

  it("force l'enrôlement pour un SUPERADMIN sans 2FA", () => {
    expect(requires2faEnrollment("SUPERADMIN", false)).toBe(true);
  });

  it("ne force pas quand la 2FA est déjà active", () => {
    expect(requires2faEnrollment("ADMIN", true)).toBe(false);
    expect(requires2faEnrollment("SUPERADMIN", true)).toBe(false);
  });

  it("ne force JAMAIS les rôles non concernés (même sans 2FA)", () => {
    for (const role of ["RESPONSABLE_FORMATION", "ASSISTANT", "FORMATEUR", "APPRENANT"] as const) {
      expect(requires2faEnrollment(role, false)).toBe(false);
    }
  });

  it("la liste des rôles obligatoires = exactement ADMIN + SUPERADMIN", () => {
    expect([...ROLES_2FA_OBLIGATOIRE].sort()).toEqual(["ADMIN", "SUPERADMIN"]);
  });
});
