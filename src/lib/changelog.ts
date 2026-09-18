import { z } from "zod";

/**
 * Changelog / notes de version (« mises à jour »). Modèle GLOBAL (produit-wide,
 * hors tenant) : une version = un `Release`, composée d'entrées `ReleaseEntry`.
 *
 * Ce module ne contient QUE de la logique pure (tri, filtrage, validation) — sans
 * import Prisma — pour rester testable sans base ni mock. Les lectures en base sont
 * dans `changelog-data.ts`, les mutations dans `actions/changelog-actions.ts`.
 */

export const RELEASE_CATEGORIES = ["NOUVEAUTE", "AMELIORATION", "CORRECTION", "SECURITE"] as const;
export type ReleaseCategory = (typeof RELEASE_CATEGORIES)[number];

export const RELEASE_AUDIENCES = ["CLIENT", "INTERNE"] as const;
export type ReleaseAudience = (typeof RELEASE_AUDIENCES)[number];

export const CATEGORY_LABELS: Record<ReleaseCategory, string> = {
  NOUVEAUTE: "Nouveauté",
  AMELIORATION: "Amélioration",
  CORRECTION: "Correction",
  SECURITE: "Sécurité",
};

export const AUDIENCE_LABELS: Record<ReleaseAudience, string> = {
  CLIENT: "Clients",
  INTERNE: "Interne (dev)",
};

/** Vue structurale (indépendante de Prisma) manipulée par l'UI et les helpers. */
export type ChangelogEntry = {
  id: string;
  category: ReleaseCategory;
  title: string;
  body: string | null;
  audience: ReleaseAudience;
  order: number;
};

export type ChangelogRelease = {
  id: string;
  version: string;
  name: string | null;
  releasedAt: Date | null;
  entries: ChangelogEntry[];
};

/** Découpe une version en segments numériques ("2.10.0" → [2,10,0]). */
function parseVersion(v: string): number[] {
  return v
    .split(/[.\-+]/)
    .map((p) => {
      const n = parseInt(p, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

/**
 * Compare deux versions pour un tri DÉCROISSANT (numérique par segment, pas
 * lexical → "2.10.0" est supérieur à "2.9.0"). Renvoie < 0 si `a` doit précéder
 * `b` (donc si `a` est la version la plus récente).
 */
export function compareVersionsDesc(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d !== 0) return d;
  }
  return b.localeCompare(a);
}

/** Trie les versions de la plus récente à la plus ancienne (version, puis date). */
export function sortReleasesDesc<T extends { version: string; releasedAt: Date | null }>(
  releases: readonly T[],
): T[] {
  return [...releases].sort((a, b) => {
    const v = compareVersionsDesc(a.version, b.version);
    if (v !== 0) return v;
    const ta = a.releasedAt?.getTime() ?? 0;
    const tb = b.releasedAt?.getTime() ?? 0;
    return tb - ta;
  });
}

/** Une version est publiée si `releasedAt` est défini et déjà passé. */
export function isPublished(release: { releasedAt: Date | null }, now: Date = new Date()): boolean {
  return release.releasedAt != null && release.releasedAt.getTime() <= now.getTime();
}

/**
 * Vue CLIENT : versions publiées uniquement, ne conservant que les entrées
 * d'audience CLIENT (triées par `order`), en excluant les versions sans aucune
 * entrée client. Triée de la plus récente à la plus ancienne.
 */
export function clientView(releases: readonly ChangelogRelease[], now: Date = new Date()): ChangelogRelease[] {
  const filtered = releases
    .filter((r) => isPublished(r, now))
    .map((r) => ({
      ...r,
      entries: r.entries
        .filter((e) => e.audience === "CLIENT")
        .sort((a, b) => a.order - b.order),
    }))
    .filter((r) => r.entries.length > 0);
  return sortReleasesDesc(filtered);
}

/**
 * Nombre de versions publiées (vue client) postérieures à `lastSeen` — pour la
 * pastille « nouveautés non lues ». `lastSeen` null ⇒ tout est non lu.
 */
export function unreadCount(
  releases: readonly ChangelogRelease[],
  lastSeen: Date | null,
  now: Date = new Date(),
): number {
  const seen = lastSeen?.getTime() ?? 0;
  return clientView(releases, now).filter((r) => (r.releasedAt as Date).getTime() > seen).length;
}

// ─── Schémas de validation (utilisés par les Server Actions) ───

export const releaseInputSchema = z.object({
  version: z
    .string()
    .trim()
    .min(1, "Version requise")
    .max(40, "Version trop longue")
    .regex(/^[0-9]+(\.[0-9]+)*([-+][0-9A-Za-z.-]+)?$/, "Format de version invalide (ex. 2.4.0)"),
  name: z.string().trim().max(120, "Nom trop long").optional().nullable(),
});
export type ReleaseInput = z.infer<typeof releaseInputSchema>;

export const entryInputSchema = z.object({
  category: z.enum(RELEASE_CATEGORIES),
  title: z.string().trim().min(1, "Titre requis").max(200, "Titre trop long"),
  body: z.string().trim().max(4000, "Texte trop long").optional().nullable(),
  audience: z.enum(RELEASE_AUDIENCES).default("CLIENT"),
});
export type EntryInput = z.infer<typeof entryInputSchema>;
