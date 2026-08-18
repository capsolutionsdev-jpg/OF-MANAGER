import { describe, it, expect } from "vitest";
import { applyImpersonationStart, applyImpersonationStop, type ImpClaim } from "@/lib/impersonation";
import type { Role } from "@prisma/client";

type Tok = {
  role: Role;
  organismeId: string | null;
  fonctionnalites: string[];
  permissions: string[];
  imp?: ImpClaim | null;
};
const baseToken = (): Tok => ({
  role: "SUPERADMIN",
  organismeId: null,
  fonctionnalites: [],
  permissions: [],
  imp: null,
});

describe("impersonation — transition de token (mode support)", () => {
  it("START : mémorise le réel + bascule en ADMIN de l'org cible", () => {
    const t = applyImpersonationStart(baseToken(), {
      orgId: "org1",
      orgNom: "ASPR FORMATION",
      fonctionnalites: ["candidats", "sessions"],
    });
    expect(t.role).toBe("ADMIN");
    expect(t.organismeId).toBe("org1");
    expect(t.fonctionnalites).toEqual(["candidats", "sessions"]);
    expect(t.permissions).toEqual([]);
    expect(t.imp).toMatchObject({
      realRole: "SUPERADMIN",
      realOrganismeId: null,
      orgId: "org1",
      orgNom: "ASPR FORMATION",
    });
  });

  it("START refuse l'imbrication (le « réel » mémorisé n'est jamais écrasé)", () => {
    const t1 = applyImpersonationStart(baseToken(), { orgId: "org1", orgNom: "A", fonctionnalites: [] });
    const impBefore = JSON.parse(JSON.stringify(t1.imp));
    const t2 = applyImpersonationStart(t1, { orgId: "org2", orgNom: "B", fonctionnalites: [] });
    expect(t2.imp).toEqual(impBefore);
    expect(t2.organismeId).toBe("org1");
  });

  it("STOP : restaure l'identité réelle (rôle/org/permissions) et efface le claim", () => {
    const t = applyImpersonationStart(
      { role: "SUPERADMIN", organismeId: null, fonctionnalites: [], permissions: ["x"], imp: null },
      { orgId: "org1", orgNom: "A", fonctionnalites: ["candidats"] },
    );
    const back = applyImpersonationStop(t);
    expect(back.role).toBe("SUPERADMIN");
    expect(back.organismeId).toBeNull();
    expect(back.fonctionnalites).toEqual([]);
    expect(back.permissions).toEqual(["x"]);
    expect(back.imp).toBeNull();
  });

  it("STOP sans impersonation = inchangé", () => {
    const t: Tok = { role: "ADMIN", organismeId: "orgX", fonctionnalites: ["a"], permissions: [], imp: null };
    const r = applyImpersonationStop(t);
    expect(r.role).toBe("ADMIN");
    expect(r.organismeId).toBe("orgX");
  });

  it("aller-retour START→STOP restaure exactement l'état initial", () => {
    const tok: Tok = {
      role: "SUPERADMIN",
      organismeId: null,
      fonctionnalites: [],
      permissions: ["a", "b"],
      imp: null,
    };
    const snapshot = JSON.stringify(tok);
    applyImpersonationStart(tok, { orgId: "o", orgNom: "N", fonctionnalites: ["f"] });
    applyImpersonationStop(tok);
    expect(JSON.stringify(tok)).toBe(snapshot);
  });
});
