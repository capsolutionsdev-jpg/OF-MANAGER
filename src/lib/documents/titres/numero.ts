import { nextSequence } from "@/lib/numerotation";
import type { TitreTypeDef } from "./catalog";

/**
 * Numérotation des titres délivrés.
 *
 * - Diplômes SSIAP : numéro officiel préfectoral `DEPT-AGRÉMENT-NIVEAU-ANNÉE-SEQ`
 *   (ex. `093-0042-1-2026-00001`). PAS de clé de contrôle (numéro externe).
 * - Autres titres (recyclage, remise à niveau, VTC/Taxi, habilitations) :
 *   `PRÉFIXE-ANNÉE-SEQ-CLÉ` où CLÉ est un chiffre de contrôle de Luhn calculé
 *   sur les chiffres du numéro — permet à l'API de vérification de rejeter un
 *   numéro mal formé AVANT toute requête en base.
 *
 * La séquence SEQ est atomique par organisme, remise à zéro chaque année, et
 * cloisonnée par clé (donc par type de titre + niveau).
 */

/** Chiffre de contrôle de Luhn sur les chiffres de la chaîne (0-9). */
export function luhn(input: string): number {
  const digits = input.replace(/\D/g, "").split("").map(Number).reverse();
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let x = digits[i];
    if (i % 2 === 0) {
      x *= 2;
      if (x > 9) x -= 9;
    }
    sum += x;
  }
  return (10 - (sum % 10)) % 10;
}

/** Vérifie la clé de Luhn d'un numéro de type `…-SEQ-CLÉ`. */
export function checkLuhn(numero: string): boolean {
  const m = numero.match(/^(.*)-(\d)$/);
  if (!m) return false;
  return luhn(m[1]) === Number(m[2]);
}

/** Configuration SSIAP (département + n° d'agrément) rangée dans documentsConfig. */
export type SsiapConfig = { departement?: string; agrement?: string };

/**
 * Génère (et réserve atomiquement) le prochain numéro pour un type de titre.
 * `niveau` n'est requis que pour les titres SSIAP.
 */
export async function genNumeroTitre(
  organismeId: string,
  def: TitreTypeDef,
  opts: { niveau?: 1 | 2 | 3; year?: number; ssiap?: SsiapConfig } = {},
): Promise<string> {
  const year = opts.year ?? new Date().getFullYear();

  // Diplôme SSIAP → numéro préfectoral, séquence par niveau + année.
  if (def.kind === "diplome") {
    const niveau = opts.niveau ?? def.niveau ?? 1;
    const cle = `TITRE-SSIAP-DIPLOME-N${niveau}-${year}`;
    const seq = await nextSequence(organismeId, cle);
    const dept = (opts.ssiap?.departement || "0XX").padStart(3, "0");
    const agr = opts.ssiap?.agrement || "XXXX";
    return `${dept}-${agr}-${niveau}-${year}-${String(seq).padStart(5, "0")}`;
  }

  // Attestations → PRÉFIXE-ANNÉE-SEQ-CLÉ (Luhn).
  const prefix = def.numberPrefix!;
  const cle = `TITRE-${prefix}-${year}`;
  const seq = await nextSequence(organismeId, cle);
  const base = `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
  return def.appliqueLuhn ? `${base}-${luhn(base)}` : base;
}

/** Extrait le niveau SSIAP (1/2/3) d'un numéro de diplôme préfectoral. */
export function niveauFromNumero(numero: string): 1 | 2 | 3 | null {
  const m = numero.match(/^\d{3}-[^-]+-([123])-\d{4}-\d+$/);
  return m ? (Number(m[1]) as 1 | 2 | 3) : null;
}
