"use server";

import { prisma } from "@/lib/prisma";

/**
 * Configure la formation TFP APS (Agent de Prévention et de Sécurité).
 * - 2 jurés (formateur + expert externe)
 * - Grille d'examen INRS APS_EXAMEN
 */

export async function configureTfpAps() {
  const CAP_ID = process.env.VITRINE_ORGANISME_ID || "cmqc20ql20000uv5wlclphbg8";

  const updated = await prisma.formation.updateMany({
    where: { reference: "tfp-aps-agent-prevention-securite", organismeId: CAP_ID },
    data: {
      nbJury: 2,
      grilleInrs: "APS_EXAMEN",
    },
  });

  return { reference: "tfp-aps-agent-prevention-securite", nbJury: 2, grilleInrs: "APS_EXAMEN", updated: updated.count };
}
