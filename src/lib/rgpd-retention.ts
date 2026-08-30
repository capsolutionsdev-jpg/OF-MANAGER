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

// Conservation des journaux d'e-mails (matrice de conservation : « 6 mois à 1 an »).
const EMAILLOG_RETENTION_MONTHS = 12;

/**
 * Purge des journaux d'e-mails au-delà de la durée de conservation (audit A02-008).
 * La matrice de conservation prévoyait une durée, mais AUCUN cron ne l'appliquait →
 * les `EmailLog` (destinataire nominatif + sujet/corps) s'accumulaient sans limite.
 * Suppression globale (tous tenants) — c'est une purge de rétention, exécutée par
 * le cron RGPD protégé par CRON_SECRET.
 */
export async function purgeOldEmailLogs(): Promise<{ emailLogs: number }> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - EMAILLOG_RETENTION_MONTHS);
  const { count } = await prisma.emailLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return { emailLogs: count };
}
