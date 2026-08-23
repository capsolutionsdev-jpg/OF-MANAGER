import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// vi.hoisted : `organisme` doit exister avant la factory hoistée.
const { organisme } = vi.hoisted(() => ({ organisme: { findUnique: vi.fn(), updateMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: { organisme } }));

import { genOfCode, ensureOfCode } from "@/lib/documents/titres/of-code";

const SAFE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

describe("genOfCode", () => {
  it("6 caractères, alphabet neutre sans ambigus (0/O/1/I/L)", () => {
    for (let i = 0; i < 100; i++) expect(genOfCode()).toMatch(SAFE);
  });
});

describe("ensureOfCode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renvoie le code existant sans rien générer", async () => {
    organisme.findUnique.mockResolvedValue({ codeVerification: "AB2CD3" });
    const c = await ensureOfCode("org1");
    expect(c).toBe("AB2CD3");
    expect(organisme.updateMany).not.toHaveBeenCalled();
  });

  it("génère + persiste un code neutre si absent", async () => {
    organisme.findUnique.mockResolvedValue({ codeVerification: null });
    organisme.updateMany.mockResolvedValue({ count: 1 });
    const c = await ensureOfCode("org1");
    expect(c).toMatch(SAFE);
    expect(organisme.updateMany).toHaveBeenCalledOnce();
    // n'écrit que si codeVerification est encore nul (anti-écrasement de course)
    expect(organisme.updateMany.mock.calls[0][0].where).toMatchObject({ id: "org1", codeVerification: null });
  });

  it("si une course a posé le code (updateMany count 0), relit et renvoie ce code", async () => {
    organisme.findUnique
      .mockResolvedValueOnce({ codeVerification: null }) // 1er check
      .mockResolvedValueOnce({ codeVerification: "RACE99" }); // relecture après count 0
    organisme.updateMany.mockResolvedValue({ count: 0 });
    const c = await ensureOfCode("org1");
    expect(c).toBe("RACE99");
  });
});
