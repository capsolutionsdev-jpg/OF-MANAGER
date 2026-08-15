import "server-only";
import { prisma } from "@/lib/prisma";
import { anonymiseCandidatComplet } from "@/lib/rgpd/anonymise";

// Purge RGPD : anonymise les données personnelles des candidats au-delà de la
// durée de conservation de leur organisme (Organisme.dureeConservationMois).
// On conserve l'enregistrement (obligations Qualiopi/comptables) mais on efface
// TOUTES les données identifiantes — même logique COMPLÈTE que l'effacement
// manuel (candidat + pièces + signatures + IP + messages), cf. lib/rgpd/anonymise.

const ANON_DEFAULT_MONTHS = 36;
const BATCH = 500; // borne par exécution de cron

/** Anonymise un candidat (effacement complet, enregistrement conservé). */
async function anonymise(organismeId: string, candidatId: string) {
  await anonymiseCandidatComplet(prisma, organismeId, candidatId, {
    action: "PURGE_RGPD_AUTO",
  });
}

/**
 * Parcourt tous les organismes et anonymise les candidats inactifs au-delà de
 * leur durée de conservation. Garde-fou : on n'anonymise pas un candidat dont
 * une session se termine après la date butoir (dossier encore vivant).
 */
export async function purgeExpiredCandidats(): Promise<{ organismes: number; anonymises: number }> {
  const orgs = await prisma.organisme.findMany({
    select: { id: true, dureeConservationMois: true },
  });
  const now = new Date();
  let anonymises = 0;

  for (const org of orgs) {
    const months = org.dureeConservationMois || ANON_DEFAULT_MONTHS;
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);

    const candidats = await prisma.candidat.findMany({
      where: {
        organismeId: org.id,
        anonymiseLe: null,
        statut: { not: "ARCHIVE" },
        updatedAt: { lt: cutoff },
        inscriptions: { none: { session: { dateFin: { gte: cutoff } } } },
      },
      select: { id: true },
      take: BATCH,
    });

    for (const c of candidats) {
      await anonymise(org.id, c.id);
      anonymises++;
    }
  }

  return { organismes: orgs.length, anonymises };
}
