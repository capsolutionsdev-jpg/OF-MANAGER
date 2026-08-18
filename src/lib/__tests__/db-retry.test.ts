import { describe, it, expect, vi } from "vitest";
import { withDbRetry, safeRead } from "@/lib/db-retry";

describe("withDbRetry — résilience aux erreurs transitoires", () => {
  it("renvoie le résultat du premier coup", async () => {
    expect(await withDbRetry(async () => 42)).toBe(42);
  });

  it("ré-essaie sur message réseau transitoire puis réussit", async () => {
    let n = 0;
    const r = await withDbRetry(
      async () => {
        if (++n < 2) throw new Error("Connection reset by peer");
        return "ok";
      },
      3,
      1,
    );
    expect(r).toBe("ok");
    expect(n).toBe(2);
  });

  it("ré-essaie sur code Prisma transitoire (P1017)", async () => {
    let n = 0;
    const r = await withDbRetry(
      async () => {
        if (++n < 3) {
          const e = new Error("server closed") as Error & { code?: string };
          e.code = "P1017";
          throw e;
        }
        return "ok";
      },
      3,
      1,
    );
    expect(r).toBe("ok");
    expect(n).toBe(3);
  });

  it("relance IMMÉDIATEMENT une erreur applicative (non transitoire)", async () => {
    let n = 0;
    await expect(
      withDbRetry(
        async () => {
          n++;
          const e = new Error("Unique constraint failed") as Error & { code?: string };
          e.code = "P2002";
          throw e;
        },
        3,
        1,
      ),
    ).rejects.toThrow(/Unique constraint/);
    expect(n).toBe(1); // aucun ré-essai sur une erreur non transitoire
  });

  it("épuise les ré-essais puis relance l'erreur transitoire", async () => {
    let n = 0;
    await expect(
      withDbRetry(
        async () => {
          n++;
          throw new Error("pool timeout");
        },
        3,
        1,
      ),
    ).rejects.toThrow(/pool timeout/);
    expect(n).toBe(3);
  });
});

describe("safeRead — dégradation des sections secondaires", () => {
  it("renvoie le fallback après échec persistant (jamais de throw)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await safeRead(async () => {
      throw new Error("can't reach database server");
    }, ["fallback"], "test");
    expect(r).toEqual(["fallback"]);
  });

  it("renvoie la vraie valeur quand tout va bien", async () => {
    expect(await safeRead(async () => [1, 2, 3], [], "test")).toEqual([1, 2, 3]);
  });
});
