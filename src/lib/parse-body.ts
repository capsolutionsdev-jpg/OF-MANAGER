import { z } from "zod";

/**
 * Validation d'entrée par SCHÉMA pour les route handlers (A12-013).
 *
 * Remplace le `await req.json()` + vérifications ad hoc : parse le corps, le valide
 * contre un schéma zod, et renvoie soit les données typées, soit un message d'erreur
 * exploitable (400). Uniformise le contrat d'entrée et réduit la surface de fuzzing.
 */
export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, error: "Corps de requête invalide (JSON attendu)." };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const champ = first?.path.join(".") || "champ";
    return { ok: false, error: first ? `${champ} : ${first.message}` : "Données invalides." };
  }
  return { ok: true, data: parsed.data };
}
