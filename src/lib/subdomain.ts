import { prisma } from "@/lib/prisma";
import { RESERVED } from "@/lib/tenant-host";

/** Normalise une chaîne en label de sous-domaine valide (a-z0-9 + tirets). */
export function toSubdomain(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40);
}

/** Vrai si le label est utilisable comme sous-domaine de tenant. */
export function isValidSubdomain(s: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(s) && !RESERVED.has(s) && !/^\d+$/.test(s);
}

/**
 * Propose un sous-domaine unique à partir d'un nom (ex. « Mon Centre » → « mon-centre »).
 * Ajoute un suffixe numérique si déjà pris ou réservé. `excludeId` ignore l'organisme courant.
 */
export async function uniqueSubdomain(base: string, excludeId?: string): Promise<string> {
  let root = toSubdomain(base) || "of";
  if (RESERVED.has(root) || /^\d+$/.test(root)) root = `of-${root}`;
  let candidate = root;
  let n = 1;
  // Boucle bornée : tente root, root-2, root-3, …
  for (let i = 0; i < 200; i++) {
    const existing = await prisma.organisme.findUnique({
      where: { sousDomaine: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${root}-${n}`.slice(0, 40);
  }
  // Repli improbable : suffixe aléatoire.
  return `${root}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 40);
}
