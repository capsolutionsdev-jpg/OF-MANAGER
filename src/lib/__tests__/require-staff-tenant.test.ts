import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Test de non-régression — audit P2-1 (BFLA). Les Server Actions de gestion
 * doivent refuser les rôles à login mais NON-staff (APPRENANT/FORMATEUR), qui
 * pourraient sinon invoquer une mutation via son action-ID (le middleware ne
 * confine que par URL). `requireStaffTenant()` est le garde commun.
 */
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const { requireStaffTenant } = await import("@/lib/tenant");

describe("requireStaffTenant — garde BFLA", () => {
  beforeEach(() => mockAuth.mockReset());

  it("rejette APPRENANT (même avec un organisme)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "APPRENANT", organismeId: "org1" } });
    await expect(requireStaffTenant()).rejects.toThrow(/personnel/i);
  });

  it("rejette FORMATEUR", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "FORMATEUR", organismeId: "org1" } });
    await expect(requireStaffTenant()).rejects.toThrow();
  });

  it("rejette un accès sans organisme (SUPERADMIN / non connecté)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN", organismeId: null } });
    await expect(requireStaffTenant()).rejects.toThrow();
  });

  it("accepte ADMIN rattaché à un organisme", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN", organismeId: "org1" } });
    const r = await requireStaffTenant();
    expect(r.organismeId).toBe("org1");
    expect(r.db).toBeTruthy();
  });

  it("accepte ASSISTANT et RESPONSABLE_FORMATION", async () => {
    for (const role of ["ASSISTANT", "RESPONSABLE_FORMATION"]) {
      mockAuth.mockResolvedValue({ user: { id: "u1", role, organismeId: "org1" } });
      await expect(requireStaffTenant()).resolves.toMatchObject({ organismeId: "org1" });
    }
  });
});
