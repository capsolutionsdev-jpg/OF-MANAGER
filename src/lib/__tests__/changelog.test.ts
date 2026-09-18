import { describe, it, expect } from "vitest";
import {
  compareVersionsDesc,
  sortReleasesDesc,
  isPublished,
  clientView,
  unreadCount,
  releaseInputSchema,
  entryInputSchema,
  type ChangelogRelease,
} from "@/lib/changelog";

function release(partial: Partial<ChangelogRelease> & { version: string }): ChangelogRelease {
  return {
    id: partial.id ?? partial.version,
    version: partial.version,
    name: partial.name ?? null,
    releasedAt: partial.releasedAt ?? null,
    entries: partial.entries ?? [],
  };
}

const PAST = new Date("2026-01-01T00:00:00Z");
const LATER = new Date("2026-06-01T00:00:00Z");
const FUTURE = new Date("2999-01-01T00:00:00Z");

describe("compareVersionsDesc", () => {
  it("trie numériquement, pas lexicalement (2.10 > 2.9)", () => {
    expect(compareVersionsDesc("2.10.0", "2.9.0")).toBeLessThan(0);
    expect(compareVersionsDesc("2.9.0", "2.10.0")).toBeGreaterThan(0);
  });
  it("égalité = 0", () => {
    expect(compareVersionsDesc("1.0.0", "1.0.0")).toBe(0);
  });
});

describe("sortReleasesDesc", () => {
  it("ordonne de la plus récente à la plus ancienne", () => {
    const out = sortReleasesDesc([
      release({ version: "1.0.0" }),
      release({ version: "2.10.0" }),
      release({ version: "2.9.0" }),
    ]);
    expect(out.map((r) => r.version)).toEqual(["2.10.0", "2.9.0", "1.0.0"]);
  });
  it("départage les versions égales par date de publication décroissante", () => {
    const out = sortReleasesDesc([
      release({ id: "a", version: "1.0.0", releasedAt: PAST }),
      release({ id: "b", version: "1.0.0", releasedAt: LATER }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("isPublished", () => {
  it("faux si brouillon (releasedAt null)", () => {
    expect(isPublished({ releasedAt: null })).toBe(false);
  });
  it("faux si date future", () => {
    expect(isPublished({ releasedAt: FUTURE }, LATER)).toBe(false);
  });
  it("vrai si date passée", () => {
    expect(isPublished({ releasedAt: PAST }, LATER)).toBe(true);
  });
});

describe("clientView", () => {
  const releases: ChangelogRelease[] = [
    release({
      id: "pub",
      version: "2.0.0",
      releasedAt: PAST,
      entries: [
        { id: "e2", category: "NOUVEAUTE", title: "B", body: null, audience: "CLIENT", order: 2 },
        { id: "e1", category: "AMELIORATION", title: "A", body: null, audience: "CLIENT", order: 1 },
        { id: "eint", category: "CORRECTION", title: "interne", body: null, audience: "INTERNE", order: 0 },
      ],
    }),
    release({ id: "draft", version: "3.0.0", releasedAt: null, entries: [
      { id: "e", category: "NOUVEAUTE", title: "X", body: null, audience: "CLIENT", order: 0 },
    ] }),
    release({ id: "interneonly", version: "1.5.0", releasedAt: PAST, entries: [
      { id: "e", category: "CORRECTION", title: "fix", body: null, audience: "INTERNE", order: 0 },
    ] }),
  ];

  it("ne garde que les versions publiées avec au moins une entrée CLIENT", () => {
    const view = clientView(releases, LATER);
    expect(view.map((r) => r.id)).toEqual(["pub"]);
  });
  it("retire les entrées INTERNE et trie les entrées par ordre", () => {
    const view = clientView(releases, LATER);
    expect(view[0].entries.map((e) => e.id)).toEqual(["e1", "e2"]);
  });
});

describe("unreadCount", () => {
  const releases: ChangelogRelease[] = [
    release({ id: "old", version: "1.0.0", releasedAt: PAST, entries: [
      { id: "e", category: "NOUVEAUTE", title: "old", body: null, audience: "CLIENT", order: 0 },
    ] }),
    release({ id: "new", version: "2.0.0", releasedAt: LATER, entries: [
      { id: "e", category: "NOUVEAUTE", title: "new", body: null, audience: "CLIENT", order: 0 },
    ] }),
  ];
  it("compte les versions publiées postérieures à lastSeen", () => {
    expect(unreadCount(releases, PAST, FUTURE)).toBe(1); // seule "new" est postérieure
  });
  it("lastSeen null ⇒ toutes non lues", () => {
    expect(unreadCount(releases, null, FUTURE)).toBe(2);
  });
});

describe("releaseInputSchema", () => {
  it("accepte une version sémantique", () => {
    expect(releaseInputSchema.safeParse({ version: "2.4.0" }).success).toBe(true);
    expect(releaseInputSchema.safeParse({ version: "1.2.3-beta.1" }).success).toBe(true);
  });
  it("rejette une version vide ou non numérique", () => {
    expect(releaseInputSchema.safeParse({ version: "" }).success).toBe(false);
    expect(releaseInputSchema.safeParse({ version: "abc" }).success).toBe(false);
  });
});

describe("entryInputSchema", () => {
  it("accepte une entrée valide et applique l'audience par défaut", () => {
    const parsed = entryInputSchema.safeParse({ category: "NOUVEAUTE", title: "Titre" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.audience).toBe("CLIENT");
  });
  it("rejette un titre vide ou une catégorie inconnue", () => {
    expect(entryInputSchema.safeParse({ category: "NOUVEAUTE", title: "" }).success).toBe(false);
    expect(entryInputSchema.safeParse({ category: "XXX", title: "ok" }).success).toBe(false);
  });
});
