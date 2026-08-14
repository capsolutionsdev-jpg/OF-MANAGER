"use server";

import { prisma } from "@/lib/prisma";

/**
 * Configure les formations APS-like (MAC APS, Opérateur vidéoprotection, Agent protection rapproché) :
 * - Nombre de jurés pour l'examen
 * - Grilles d'examen INRS
 *
 * Prérequis : SOIT Carte pro valide, SOIT Autorisation CNAPS valide
 */

const APS_LIKE_CONFIG = {
  // MAC APS — renouvellement carte pro APS (valable 3 ans)
  "SAF-MAC-APS-RECYCLAGE": { nbJury: 1, grilleInrs: "APS_EXAMEN" },
  "mac-aps-recyclage": { nbJury: 1, grilleInrs: "APS_EXAMEN" },

  // Opérateur vidéoprotection — initial + VAE
  "operateur-videoprotection-initiale": { nbJury: 2, grilleInrs: "VIDEOPROTECTION_EXAMEN" },
  "operateur-videoprotection-vae": { nbJury: 2, grilleInrs: "VIDEOPROTECTION_EXAMEN" },

  // Agent de protection rapproché (APR) — initial + VAE
  "agent-protection-rapproche-initiale": { nbJury: 2, grilleInrs: "APR_EXAMEN" },
  "agent-protection-rapproche-vae": { nbJury: 2, grilleInrs: "APR_EXAMEN" },
};

/**
 * Configure les formations APS-like pour CAP Compétences.
 */
export async function configureApsLikeFormations() {
  const CAP_ID = process.env.VITRINE_ORGANISME_ID || "cmqc20ql20000uv5wlclphbg8";
  const results = [];

  for (const [ref, config] of Object.entries(APS_LIKE_CONFIG)) {
    const updated = await prisma.formation.updateMany({
      where: { reference: ref, organismeId: CAP_ID },
      data: {
        nbJury: config.nbJury,
        grilleInrs: config.grilleInrs,
      },
    });
    results.push({ reference: ref, nbJury: config.nbJury, grilleInrs: config.grilleInrs, updated: updated.count });
  }

  return results;
}
