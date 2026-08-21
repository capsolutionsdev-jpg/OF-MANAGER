import "server-only";
import { getTenantDb } from "@/lib/tenant";

/**
 * Accès données du portail client B2B (rôle ENTREPRISE).
 *
 * ISOLATION — POINT CRITIQUE : `getTenantDb()` cloisonne automatiquement par
 * ORGANISME (le tenant OF), PAS par entreprise. Deux entreprises d'un même OF
 * ne sont donc PAS isolées automatiquement : chaque requête ci-dessous DOIT
 * filtrer manuellement par `entrepriseId` (l'entreprise du user connecté,
 * obtenue via `requireEntreprise()`/`getCurrentEntreprise()`). Ne jamais
 * exposer une requête sans ce filtre → fuite entre clients.
 */

/** Planning des sessions à venir de l'organisme (catalogue) + places restantes. */
export async function getEntreprisePlanning() {
  const db = await getTenantDb();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const sessions = await db.session.findMany({
    where: {
      isArchived: false,
      statut: { in: ["PLANIFIEE", "OUVERTE"] },
      dateDebut: { gte: start },
    },
    select: {
      id: true,
      dateDebut: true,
      dateFin: true,
      lieu: true,
      modalite: true,
      nbPlaces: true,
      formation: { select: { titre: true } },
      inscriptions: { where: { statut: { not: "ANNULEE" } }, select: { id: true } },
    },
    orderBy: { dateDebut: "asc" },
    take: 60,
  });
  return sessions.map((s) => ({
    id: s.id,
    titre: s.formation.titre,
    dateDebut: s.dateDebut,
    dateFin: s.dateFin,
    lieu: s.lieu,
    modalite: s.modalite,
    placesTotal: s.nbPlaces,
    placesRestantes: Math.max(0, s.nbPlaces - s.inscriptions.length),
  }));
}

/** Inscriptions de l'entreprise (hors annulées), pour la rubrique Inscriptions. */
export async function getEntrepriseInscriptions(entrepriseId: string) {
  const db = await getTenantDb();
  return db.inscription.findMany({
    where: { entrepriseId, statut: { not: "ANNULEE" } },
    select: {
      id: true,
      statut: true,
      candidat: { select: { prenom: true, nom: true } },
      session: {
        select: {
          dateDebut: true,
          dateFin: true,
          lieu: true,
          formation: { select: { titre: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Suivi pédagogique : résultat de certification par salarié inscrit. */
export async function getEntrepriseSuivi(entrepriseId: string) {
  const db = await getTenantDb();
  return db.inscription.findMany({
    where: { entrepriseId, statut: { not: "ANNULEE" } },
    select: {
      id: true,
      resultatCertification: true,
      certificationDate: true,
      candidat: { select: { prenom: true, nom: true } },
      session: {
        select: { dateFin: true, formation: { select: { titre: true } } },
      },
    },
    orderBy: [{ certificationDate: "desc" }, { createdAt: "desc" }],
  });
}

/** Documents générés rattachés à une inscription de l'entreprise. */
export async function getEntrepriseDocuments(entrepriseId: string) {
  const db = await getTenantDb();
  return db.documentGenere.findMany({
    where: { inscription: { entrepriseId } },
    select: {
      id: true,
      type: true,
      fileUrl: true,
      createdAt: true,
      session: { select: { formation: { select: { titre: true } } } },
      inscription: { select: { candidat: { select: { prenom: true, nom: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Factures de l'entreprise (PDF déposé par l'admin, téléchargeable). */
export async function getEntrepriseFactures(entrepriseId: string) {
  const db = await getTenantDb();
  const factures = await db.facture.findMany({
    where: { entrepriseId },
    select: {
      id: true,
      reference: true,
      dateEmission: true,
      montantTTC: true,
      statut: true,
      fileUrl: true,
    },
    orderBy: { dateEmission: "desc" },
  });
  // Decimal → number pour un rendu simple côté page.
  return factures.map((f) => ({ ...f, montantTTC: Number(f.montantTTC) }));
}
