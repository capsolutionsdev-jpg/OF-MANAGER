import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Garde-fou d'isolation multi-tenant (ARC-2 / TRX-5).
 *
 * Les pages de l'espace connecté doivent lire les données via `getTenantDb()`
 * (scoping automatique par organisme), et NON via le client brut `@/lib/prisma`
 * (qui exige un filtre `organismeId` manuel — un oubli = fuite entre organismes).
 *
 * Ce test échoue si une NOUVELLE page importe `@/lib/prisma` directement. Les
 * cas légitimes existants (admin, profil, RGPD, layout, module de validations
 * générique) sont explicitement recensés ci-dessous. Réduire cette liste au fil
 * de l'eau ; ne JAMAIS l'agrandir sans justification.
 */
const ALLOWLIST = new Set([
  "administration/page.tsx",
  "layout.tsx",
  "mon-compte/page.tsx",
  "rgpd/page.tsx",
  "validations/page.tsx",
]);

const APP_DIR = path.resolve(__dirname, "../../app/(app)");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("Garde-fou : pas d'accès prisma direct dans les pages (app)", () => {
  it("aucune page hors allowlist n'importe @/lib/prisma", () => {
    const offenders: string[] = [];
    for (const file of walk(APP_DIR)) {
      const rel = path.relative(APP_DIR, file).replace(/\\/g, "/");
      const src = readFileSync(file, "utf8");
      if (/from ["']@\/lib\/prisma["']/.test(src) && !ALLOWLIST.has(rel)) {
        offenders.push(rel);
      }
    }
    expect(
      offenders,
      `Ces pages doivent utiliser getTenantDb() au lieu de @/lib/prisma :\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
