/**
 * Phase 3.4 — Session Creation Flow
 * 4 steps: metadata → rooms → pricing → confirmation
 */

import { z } from "zod";

export const sessionFlowSchema = z.object({
  // Step 1: Metadata
  formationId: z.string().uuid("Formation requise"),
  startDate: z.string().refine((d) => new Date(d) > new Date(), "Date future requise"),
  endDate: z.string(),
  maxCapacity: z.number().min(1).max(100),
  formateurs: z.array(z.string().uuid()).min(1, "Au moins 1 formateur requis"),

  // Step 2: Room Selection
  roomId: z.string().uuid("Salle requise"),
  roomCapacity: z.number().min(1),

  // Step 3: Pricing
  price: z.number().positive("Prix > 0"),
  currency: z.enum(["EUR", "USD"]).default("EUR"),
  discountPercent: z.number().min(0).max(100).default(0),

  // Meta
  status: z.enum(["draft", "confirmed", "cancelled"]).default("draft"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SessionFlowData = z.infer<typeof sessionFlowSchema>;

/**
 * Validation par étape
 */
export function validateSessionStep(step: number, data: Partial<SessionFlowData>) {
  switch (step) {
    case 1:
      return z
        .object({
          formationId: sessionFlowSchema.shape.formationId,
          startDate: sessionFlowSchema.shape.startDate,
          endDate: sessionFlowSchema.shape.endDate,
          maxCapacity: sessionFlowSchema.shape.maxCapacity,
          formateurs: sessionFlowSchema.shape.formateurs,
        })
        .safeParse(data);

    case 2:
      return z
        .object({
          roomId: sessionFlowSchema.shape.roomId,
          roomCapacity: sessionFlowSchema.shape.roomCapacity,
        })
        .safeParse(data);

    case 3:
      return z
        .object({
          price: sessionFlowSchema.shape.price,
          currency: sessionFlowSchema.shape.currency,
          discountPercent: sessionFlowSchema.shape.discountPercent,
        })
        .safeParse(data);

    case 4:
      return sessionFlowSchema.safeParse(data);

    default:
      return { success: false };
  }
}

/**
 * Calculate total price with discount
 */
export function calculateSessionPrice(
  price: number,
  discountPercent: number,
  capacity: number
): { subtotal: number; discount: number; total: number } {
  const subtotal = price * capacity;
  const discount = subtotal * (discountPercent / 100);
  const total = subtotal - discount;

  return { subtotal, discount, total };
}

/**
 * Room capacity validation
 */
export function validateRoomCapacity(
  roomCapacity: number,
  maxCapacity: number
): { isValid: boolean; message?: string } {
  if (roomCapacity < maxCapacity) {
    return {
      isValid: false,
      message: `Salle trop petite (${roomCapacity} places pour ${maxCapacity} candidats)`,
    };
  }

  return { isValid: true };
}

/**
 * Session summary for confirmation
 */
export function generateSessionSummary(data: SessionFlowData): string {
  const lines = [
    "## Résumé de la session",
    "",
    "### Dates",
    `Du ${new Date(data.startDate).toLocaleDateString("fr-FR")} au ${new Date(data.endDate).toLocaleDateString("fr-FR")}`,
    "",
    "### Capacité",
    `${data.maxCapacity} places (salle: ${data.roomCapacity})`,
    "",
    "### Prix",
    `${data.price}€ / candidat${data.discountPercent > 0 ? ` (-${data.discountPercent}%)` : ""}`,
    "",
    "### Formateurs",
    data.formateurs.map((f) => `- ${f}`).join("\n"),
  ];

  return lines.join("\n");
}
