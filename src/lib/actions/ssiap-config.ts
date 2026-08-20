"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";

/**
 * Configure les paramètres réglementaires des formations SSIAP 1/2/3 initial :
 * - nbJury (nombre de jurés)
 * - grilleInrs (grille d'examen, si applicable)
 */

const SSIAP_CONFIG = {
  "ssiap-1-initial": { nbJury: 1, grilleInrs: "SSIAP_1_EXAMEN" },
  "ssiap-2-initial": { nbJury: 2, grilleInrs: "SSIAP_2_EXAMEN" },
  "ssiap-3-initial": { nbJury: 2, grilleInrs: "SSIAP_3_EXAMEN" },
};

/**
 * Met à jour la config SSIAP des formations de l'organisme de la vitrine.
 * À exécuter une fois au déploiement pour synchroniser l'état.
 */
export async function configureSsiapFormations() {
  // Action de synchronisation au déploiement : réservée au compte développeur.
  // Sans ce garde, ce « use server » exporté serait un endpoint d'écriture
  // invocable sans authentification (constat d'audit §3.3).
  await requireSuperAdmin();

  const VITRINE_ID = process.env.VITRINE_ORGANISME_ID;
  // Sans organisme de vitrine défini, on ne cible aucun tenant (évite un
  // updateMany qui, avec organismeId=undefined, s'appliquerait à TOUS les tenants).
  if (!VITRINE_ID) return [];
  const results = [];

  for (const [ref, config] of Object.entries(SSIAP_CONFIG)) {
    const updated = await prisma.formation.updateMany({
      where: { reference: ref, organismeId: VITRINE_ID },
      data: {
        nbJury: config.nbJury,
        grilleInrs: config.grilleInrs,
      },
    });
    results.push({ reference: ref, ...config, updated: updated.count });
  }

  return results;
}
