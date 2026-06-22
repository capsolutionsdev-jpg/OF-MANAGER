import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// tenant.ts importe `auth` (next-auth) au niveau module, mais scopedPrisma ne
// l'utilise pas → on le stub pour éviter de charger next-auth dans Vitest.
vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));

import { prisma } from "@/lib/prisma";
import { scopedPrisma } from "@/lib/tenant";

// ⚠️ Tests d'ISOLATION MULTI-TENANT sur une VRAIE base — la zone à risque n°1.
// Auto-ignorés tant que DATABASE_URL_TEST n'est pas défini (cf. src/test/setup-db.ts),
// pour ne JAMAIS écrire dans la base de dev/prod. Pour les activer :
//   1) créer une branche Neon de test ;
//   2) DATABASE_URL_TEST="postgres://…" npx prisma db push  (schéma) ;
//   3) DATABASE_URL_TEST="postgres://…" npm test
const RUN = !!process.env.DATABASE_URL_TEST;
const suite = RUN ? describe : describe.skip;

suite("Isolation multi-tenant (scopedPrisma) — base de test", () => {
  let orgA = "";
  let orgB = "";
  let candA = "";
  let candB = "";

  beforeAll(async () => {
    const [a, b] = await Promise.all([
      prisma.organisme.create({ data: { nom: "ZZ-TEST-A" } }),
      prisma.organisme.create({ data: { nom: "ZZ-TEST-B" } }),
    ]);
    orgA = a.id;
    orgB = b.id;
    const [ca, cb] = await Promise.all([
      prisma.candidat.create({ data: { organismeId: orgA, nom: "A", prenom: "x", email: `a-${orgA}@test.local` } }),
      prisma.candidat.create({ data: { organismeId: orgB, nom: "B", prenom: "x", email: `b-${orgB}@test.local` } }),
    ]);
    candA = ca.id;
    candB = cb.id;
  });

  afterAll(async () => {
    if (!orgA) return;
    await prisma.candidat.deleteMany({ where: { organismeId: { in: [orgA, orgB] } } });
    await prisma.organisme.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  it("findMany ne renvoie QUE les candidats du tenant courant", async () => {
    const list = await scopedPrisma(orgA).candidat.findMany();
    expect(list.every((c) => c.organismeId === orgA)).toBe(true);
    expect(list.some((c) => c.id === candB)).toBe(false);
  });

  it("findUnique d'une ressource d'un AUTRE tenant → null (pas de fuite)", async () => {
    const x = await scopedPrisma(orgB).candidat.findUnique({ where: { id: candA } });
    expect(x).toBeNull();
  });

  it("update d'une ressource d'un AUTRE tenant → refusé", async () => {
    await expect(
      scopedPrisma(orgB).candidat.update({ where: { id: candA }, data: { nom: "intrusion" } }),
    ).rejects.toThrow();
    // La ressource d'origine n'a pas été modifiée
    const original = await prisma.candidat.findUnique({ where: { id: candA } });
    expect(original?.nom).toBe("A");
  });

  it("delete d'une ressource d'un AUTRE tenant → refusé", async () => {
    await expect(
      scopedPrisma(orgB).candidat.delete({ where: { id: candA } }),
    ).rejects.toThrow();
  });

  it("create injecte automatiquement l'organismeId du tenant", async () => {
    const c = await scopedPrisma(orgA).candidat.create({
      data: { nom: "Injecte", prenom: "x", email: `inj-${orgA}@test.local` },
    });
    expect(c.organismeId).toBe(orgA);
    await prisma.candidat.delete({ where: { id: c.id } });
  });
});
