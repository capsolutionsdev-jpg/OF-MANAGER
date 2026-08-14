/**
 * Phase 3.4 — Devis (Quote) Flow
 * 4 steps: formation → customer → financing → signature
 */

import { z } from "zod";

export const devisFlowSchema = z.object({
  // Step 1: Formation
  formationId: z.string().uuid(),
  formationPrice: z.number().positive(),

  // Step 2: Customer
  customerId: z.string().uuid().optional(),
  companyName: z.string().min(2),
  contactEmail: z.string().email(),
  contactName: z.string().min(2),
  contactPhone: z.string().regex(/^[0-9\s\-\+\.]+$/),

  // Step 3: Financing
  financingType: z.enum(["CPF", "OPCO", "private", "other"]),
  quantity: z.number().min(1).max(100),

  // Step 4: Signature
  signatureUrl: z.string().url().optional(),
  signedAt: z.string().optional(),

  // Calculated
  htPrice: z.number().positive(),
  tvaPercent: z.number().min(0).max(100).default(20),
  tvaAmount: z.number().default(0),
  ttcPrice: z.number().positive(),

  status: z.enum(["draft", "sent", "signed", "cancelled"]).default("draft"),
});

export type DevisFlowData = z.infer<typeof devisFlowSchema>;

/**
 * Calculate TVA based on region
 */
export function getTVAPercent(region: string): number {
  // France standard = 20%, reduced = 5.5%, etc.
  const tvaRates: Record<string, number> = {
    FR: 20,
    DE: 19,
    IT: 22,
    ES: 21,
    BE: 21,
  };

  return tvaRates[region] || 20;
}

/**
 * Calculate devis totals
 */
export function calculateDevisTotals(
  price: number,
  quantity: number,
  tvaPercent: number
): { htPrice: number; tvaAmount: number; ttcPrice: number } {
  const htPrice = price * quantity;
  const tvaAmount = htPrice * (tvaPercent / 100);
  const ttcPrice = htPrice + tvaAmount;

  return { htPrice, tvaAmount, ttcPrice };
}

/**
 * Generate devis PDF content
 */
export function generateDevisContent(data: DevisFlowData): string {
  const lines = [
    "DEVIS",
    "======",
    "",
    `Date: ${new Date().toLocaleDateString("fr-FR")}`,
    "",
    "## CLIENT",
    `Entreprise: ${data.companyName}`,
    `Contact: ${data.contactName} <${data.contactEmail}>`,
    `Téléphone: ${data.contactPhone}`,
    "",
    "## PRESTATION",
    `Quantité: ${data.quantity}`,
    `Prix unitaire: ${data.formationPrice}€ HT`,
    "",
    "## MONTANTS",
    `Sous-total HT: ${data.htPrice}€`,
    `TVA (${data.tvaPercent}%): ${data.tvaAmount}€`,
    `TOTAL TTC: ${data.ttcPrice}€`,
    "",
    "## FINANCEMENT",
    `Type: ${data.financingType}`,
    "",
    "Valide 30 jours à compter de cette date.",
  ];

  return lines.join("\n");
}

/**
 * Validate devis before sending to e-signature
 */
export function validateDevisForSignature(
  data: Partial<DevisFlowData>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.companyName) errors.push("Entreprise requise");
  if (!data.contactEmail) errors.push("Email requis");
  if (!data.ttcPrice) errors.push("Prix TTC requis");

  return {
    isValid: errors.length === 0,
    errors,
  };
}
