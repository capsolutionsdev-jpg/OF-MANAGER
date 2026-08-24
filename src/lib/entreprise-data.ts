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
      variablesJson: true,
      createdAt: true,
      session: { select: { formation: { select: { titre: true } } } },
      inscription: { select: { candidat: { select: { prenom: true, nom: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Suivi des DIPLÔMES des salariés de l'entreprise (module Diplome réel : envoyé
 * au certificateur → reçu par l'OF → remis au candidat). Diplome n'a pas de
 * relation Inscription (scalaire inscriptionId) → jointure en 2 temps, scopée à
 * l'entreprise via les inscriptions.
 */
export async function getEntrepriseDiplomes(entrepriseId: string) {
  const db = await getTenantDb();
  const inscriptions = await db.inscription.findMany({
    where: { entrepriseId },
    select: { id: true, session: { select: { formation: { select: { titre: true } } } } },
  });
  const ids = inscriptions.map((i) => i.id);
  if (ids.length === 0) return [];
  const titreParInsc = new Map(inscriptions.map((i) => [i.id, i.session?.formation?.titre ?? null]));

  const diplomes = await db.diplome.findMany({
    where: { inscriptionId: { in: ids } },
    select: {
      id: true,
      inscriptionId: true,
      nom: true,
      prenom: true,
      numeroDiplome: true,
      statut: true,
      recuAt: true,
      remisAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return diplomes.map((d) => ({
    id: d.id,
    nom: d.nom,
    prenom: d.prenom,
    numeroDiplome: d.numeroDiplome,
    statut: d.statut,
    recuAt: d.recuAt,
    remisAt: d.remisAt,
    formationTitre: d.inscriptionId ? titreParInsc.get(d.inscriptionId) ?? null : null,
  }));
}

/** Salariés (candidats) rattachés à l'entreprise — pour le choix dans la demande. */
export async function getEntrepriseCandidats(entrepriseId: string) {
  const db = await getTenantDb();
  return db.candidat.findMany({
    where: { entrepriseId },
    select: { id: true, nom: true, prenom: true },
    orderBy: { nom: "asc" },
  });
}

/** Demandes d'inscription self-service de l'entreprise (avec statut). */
export async function getEntrepriseDemandes(entrepriseId: string) {
  const db = await getTenantDb();
  return db.demandeInscription.findMany({
    where: { entrepriseId },
    select: {
      id: true,
      statut: true,
      motif: true,
      createdAt: true,
      salariesJson: true,
      session: { select: { dateDebut: true, formation: { select: { titre: true } } } },
      sessionProposee: { select: { dateDebut: true, lieu: true, formation: { select: { titre: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Conventions de l'entreprise (PDF généré + version signée + statut). */
export async function getEntrepriseConventions(entrepriseId: string) {
  const db = await getTenantDb();
  const conventions = await db.convention.findMany({
    where: { entrepriseId },
    select: {
      id: true,
      reference: true,
      montant: true,
      signatureStatut: true,
      fileUrl: true,
      fileUrlSigne: true,
      createdAt: true,
      session: { select: { dateDebut: true, formation: { select: { titre: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return conventions.map((c) => ({ ...c, montant: c.montant != null ? Number(c.montant) : null }));
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
