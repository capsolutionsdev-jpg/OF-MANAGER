import "server-only";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Code NEUTRE unique par OF (préfixe des numéros de vérification). Base de
 * vérification UNIQUE partagée entre tous les clients → le préfixe garantit
 * l'unicité GLOBALE des numéros (deux OF ne peuvent pas produire le même).
 * Le nom de l'OF n'est PAS dans le code (choix « identifiant neutre ») : c'est
 * le RÉSULTAT de la vérification qui révèle l'organisme (organismeSignataire).
 */

// 32 caractères sans ambigus (0/O, 1/I/L) → lisible sur un document.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LEN = 6; // 32^6 ≈ 1,07 milliard de combinaisons

/** Génère un code neutre aléatoire (non garanti unique — voir ensureOfCode). */
export function genOfCode(len: number = CODE_LEN): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

type Db = { organisme: (typeof prisma)["organisme"] };

/**
 * Retourne le code de vérification de l'OF, en le générant (unique) à la
 * première demande. Idempotent + tolérant aux courses (contrainte @@unique +
 * updateMany conditionnel `codeVerification: null`).
 */
export async function ensureOfCode(organismeId: string, db: Db = prisma): Promise<string> {
  const cur = await db.organisme.findUnique({
    where: { id: organismeId },
    select: { codeVerification: true },
  });
  if (cur?.codeVerification) return cur.codeVerification;

  for (let i = 0; i < 8; i++) {
    const code = genOfCode();
    try {
      // N'écrit que si toujours nul (évite d'écraser un code posé par une course).
      const res = await db.organisme.updateMany({
        where: { id: organismeId, codeVerification: null },
        data: { codeVerification: code },
      });
      if (res.count === 1) return code;
      // count 0 → un autre process l'a posé entre-temps → on relit.
      const now = await db.organisme.findUnique({
        where: { id: organismeId },
        select: { codeVerification: true },
      });
      if (now?.codeVerification) return now.codeVerification;
    } catch {
      // Collision de code avec un AUTRE OF (contrainte unique) → nouveau tirage.
    }
  }
  throw new Error("Impossible de générer un code de vérification unique pour l'organisme.");
}
