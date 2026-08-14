"use server";

import { prisma } from "@/lib/prisma";

/**
 * Configure la formation « Dirigeant d'entreprise de sécurité privée ».
 * - 3 jurés (experts du secteur, droit, finance)
 * - Pas de grille INRS (certification Scotia Formation / RNCP 40385)
 */

export async function configureDirigeantSecurite() {
  const CAP_ID = process.env.VITRINE_ORGANISME_ID || "cmqc20ql20000uv5wlclphbg8";

  const updated = await prisma.formation.updateMany({
    where: { reference: "dirigeant-societe-securite-privee-initiale", organismeId: CAP_ID },
    data: {
      nbJury: 3,
    },
  });

  return { reference: "dirigeant-societe-securite-privee-initiale", nbJury: 3, updated: updated.count };
}
