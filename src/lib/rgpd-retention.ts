import "server-only";
import { prisma } from "@/lib/prisma";

// Purge RGPD : anonymise les données personnelles des candidats au-delà de la
// durée de conservation de leur organisme (Organisme.dureeConservationMois).
// On conserve l'enregistrement (obligations Qualiopi/comptables) mais on efface
// les données identifiantes — comme l'effacement manuel (cf. rgpd-actions).

const ANON_DEFAULT_MONTHS = 36;
const BATCH = 500; // borne par exécution de cron

/** Anonymise un candidat (données identifiantes effacées, enregistrement conservé). */
async function anonymise(organismeId: string, candidatId: string) {
  await prisma.candidat.updateMany({
    where: { id: candidatId, organismeId }, // garde-fou tenant
    data: {
      nom: "Anonymisé",
      prenom: "—",
      email: `anonymise-${candidatId}@rgpd.local`,
      telephone: null,
      adresse: null,
      ville: null,
      codePostal: null,
      dateNaissance: null,
      lieuNaissance: null,
      paysNaissance: null,
      situationPro: null,
      employeur: null,
      posteOccupe: null,
      dernierDiplome: null,
      photoUrl: null,
      besoinsAdaptation: null,
      carteProNumero: null,
      statut: "ARCHIVE",
      anonymiseLe: new Date(),
    },
  });
  await prisma.auditLog.create({
    data: { organismeId, action: "PURGE_RGPD_AUTO", entityType: "Candidat", entityId: candidatId },
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
