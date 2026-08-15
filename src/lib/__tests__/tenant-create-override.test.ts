import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Test de non-régression — isolation multi-tenant, primitive d'écriture.
 *
 * Faille (défense en profondeur) : dans `scopedPrisma`, si le merge injectait
 * l'organismeId AVANT le spread du payload client (`{ organismeId, ...data }`),
 * un `organismeId` fourni dans `data` par un appelant pouvait ÉCRASER celui du
 * tenant courant → écriture cross-tenant.
 *
 * Correctif : l'organismeId du tenant est TOUJOURS placé en DERNIER, il gagne
 * toujours sur toute valeur du payload (`{ ...data, organismeId }`).
 *
 * Ce test verrouille la source (comme `prisma-direct-guard`) pour empêcher toute
 * réintroduction future du motif vulnérable. Vérifié dynamiquement en complément
 * par `scripts/audit-multitenant-isolation.mts` (17/17).
 */
describe("scopedPrisma — l'organismeId du tenant ne peut pas être écrasé par le payload", () => {
  const src = readFileSync(path.resolve(__dirname, "../tenant.ts"), "utf8");
  const norm = src.replace(/\s+/g, " ");

  it("create : organismeId en dernier ( { ...args.data, organismeId } )", () => {
    expect(norm).toContain("args.data = { ...args.data, organismeId }");
  });

  it("createMany : organismeId en dernier ( { ...d, organismeId } )", () => {
    expect(norm).toContain("({ ...d, organismeId })");
  });

  it("upsert.create : organismeId en dernier ( { ...args.create, organismeId } )", () => {
    expect(norm).toContain("args.create = { ...args.create, organismeId }");
  });

  it("aucun motif vulnérable ( organismeId placé AVANT le spread )", () => {
    expect(norm).not.toContain("{ organismeId, ...args.data }");
    expect(norm).not.toContain("{ organismeId, ...args.create }");
    expect(norm).not.toContain("({ organismeId, ...d })");
  });
});
