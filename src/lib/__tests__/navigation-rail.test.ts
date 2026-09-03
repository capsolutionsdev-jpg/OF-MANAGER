import { describe, it, expect } from "vitest";
import {
  buildRail,
  visibleNavItems,
  PILLAR_ORDER,
  SECONDARY_ORDER,
} from "@/lib/navigation";

// Rail épuré : 3 piliers quotidiens (Commercial / Formation / Finance) + groupes
// secondaires (pour le launcher « Plus »). Invariant fort : aucun item n'est perdu.
describe("buildRail — piliers quotidiens + secondaire (launcher)", () => {
  const perms: string[] = []; // ADMIN + liste vide = accès total (cf. canAccessSection)
  const fonc: string[] = []; // vide = toutes les fonctionnalités « standard » activées

  it("ADMIN : 3 piliers dans l'ordre Commercial → Formation → Finance", () => {
    const { pillars } = buildRail("ADMIN", perms, fonc);
    expect(pillars.map((p) => p.name)).toEqual(["Commercial", "Formation", "Finance"]);
  });

  it("Formation : Candidats en 1er, Sessions en 2e (pages les plus utilisées)", () => {
    const { pillars } = buildRail("ADMIN", perms, fonc);
    const formation = pillars.find((p) => p.name === "Formation")!;
    expect(formation.items[0]?.href).toBe("/candidats");
    expect(formation.items[1]?.href).toBe("/sessions");
  });

  it("le Tableau de bord reste un lien direct (standalone, hors pilier)", () => {
    const { standalone } = buildRail("ADMIN", perms, fonc);
    expect(standalone.some((i) => i.href === "/dashboard")).toBe(true);
  });

  it("les groupes secondaires suivent l'ordre défini et n'exposent que les non-vides", () => {
    const { secondary } = buildRail("ADMIN", perms, fonc);
    const names = secondary.map((g) => g.name);
    // sous-suite de SECONDARY_ORDER (ordre respecté, groupes vides retirés)
    expect(names).toEqual(SECONDARY_ORDER.filter((n) => names.includes(n)));
    expect(names).toContain("Pilotage");
  });

  it("INVARIANT : chaque item visible est placé exactement une fois (rien perdu, aucun doublon)", () => {
    const visible = visibleNavItems("ADMIN", perms, fonc)
      .map((i) => i.href)
      .sort();
    const { standalone, pillars, secondary } = buildRail("ADMIN", perms, fonc);
    const placed = [
      ...standalone,
      ...pillars.flatMap((p) => p.items),
      ...secondary.flatMap((g) => g.items),
    ].map((i) => i.href);
    expect(placed.slice().sort()).toEqual(visible);
    expect(new Set(placed).size).toBe(placed.length);
  });

  it("APPRENANT : navigation à plat — aucun pilier ni secondaire, tout en standalone", () => {
    const { standalone, pillars, secondary } = buildRail("APPRENANT", [], []);
    expect(pillars).toEqual([]);
    expect(secondary).toEqual([]);
    expect(standalone.some((i) => i.href === "/mes-formations")).toBe(true);
  });

  it("expose l'ordre des piliers", () => {
    expect(PILLAR_ORDER).toEqual(["Commercial", "Formation", "Finance"]);
  });
});
