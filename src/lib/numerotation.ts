import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Client Prisma OU client de transaction (`prisma.$transaction`) — seul le
 * délégué `numeroSequence` est requis. Permet d'allouer un numéro DANS une
 * transaction pour que l'allocation et la création du document soient atomiques.
 */
export type SeqClient = Pick<typeof prisma, "numeroSequence">;

/**
 * Numérotation séquentielle ATOMIQUE par organisme (factures, devis, avoirs).
 *
 * Remplace le comptage `count()+1` (course concurrente → doublons/trous, non
 * conforme). L'incrément passe par un `UPDATE … valeur = valeur + 1 RETURNING`
 * atomique côté PostgreSQL. La ligne de compteur est **auto-amorcée** depuis le
 * plus grand numéro déjà émis (fonction `seed`), pour ne jamais entrer en
 * collision avec l'historique lors du premier appel.
 */

/**
 * Incrémente atomiquement le compteur (organismeId, cle) et renvoie sa valeur.
 * `client` permet d'exécuter l'incrément DANS une transaction (Prisma.$transaction)
 * pour que l'allocation du numéro et la création du document soient atomiques —
 * un échec de création annule alors l'incrément (pas de trou). Défaut : prisma.
 */
export async function nextSequence(
  organismeId: string,
  cle: string,
  seed?: () => Promise<number>,
  client: SeqClient = prisma,
): Promise<number> {
  if (!organismeId) throw new Error("organismeId requis pour la numérotation.");

  // Chemin nominal : la ligne existe → incrément atomique en une requête.
  try {
    const row = await client.numeroSequence.update({
      where: { organismeId_cle: { organismeId, cle } },
      data: { valeur: { increment: 1 } },
      select: { valeur: true },
    });
    return row.valeur;
  } catch (e) {
    // P2025 = ligne inexistante → première émission pour cette clé.
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2025") throw e;
  }

  // Auto-amorçage depuis l'historique (évite toute collision avec l'existant).
  const start = seed ? await seed() : 0;
  try {
    await client.numeroSequence.create({
      data: { organismeId, cle, valeur: start + 1 },
    });
    return start + 1;
  } catch (e) {
    // P2002 = une autre requête concurrente a créé la ligne entre-temps →
    // on retombe sur l'incrément atomique.
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") throw e;
    const row = await client.numeroSequence.update({
      where: { organismeId_cle: { organismeId, cle } },
      data: { valeur: { increment: 1 } },
      select: { valeur: true },
    });
    return row.valeur;
  }
}

/**
 * Renvoie une référence formatée `PREFIX-AAAA-NNNN` (ex. `DEV-2026-0001`),
 * numérotée de façon atomique par organisme et par année.
 * `seedExisting` doit renvoyer le plus grand numéro déjà émis cette année-là.
 */
export async function nextRef(
  organismeId: string,
  prefix: string,
  seedExisting?: () => Promise<number>,
  client: SeqClient = prisma,
): Promise<string> {
  const year = new Date().getFullYear();
  const cle = `${prefix}-${year}`;
  const n = await nextSequence(organismeId, cle, seedExisting, client);
  return `${cle}-${String(n).padStart(4, "0")}`;
}

/** Extrait le plus grand suffixe numérique d'une liste de références/numéros. */
export function maxSuffix(refs: string[]): number {
  return refs.reduce((m, r) => {
    const n = Number(r.split("-").pop());
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
}
