import "server-only";
import { prisma } from "@/lib/prisma";
import type { Academy } from "@prisma/client";

// Jeu de données de DÉMONSTRATION, fictif et anonyme, injecté dans un tenant
// isDemo fraîchement provisionné. Volontairement compact (assez pour que le
// prospect se projette : formations, sessions, candidats à différents stades) —
// la version « présentation » complète reste scripts/seed-demo.mjs.

const PRENOMS = ["Camille", "Lucas", "Léa", "Hugo", "Manon", "Nathan", "Chloé", "Enzo", "Jade", "Louis", "Sarah", "Théo", "Inès", "Adam", "Emma", "Yanis", "Nina", "Rayan", "Karim", "Sofia"];
const NOMS = ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Garcia", "Bertrand", "Roux", "Vincent", "Fournier", "Benali", "Nguyen", "Diallo", "Faure"];
const VILLES: [string, string][] = [["Paris", "75011"], ["Lyon", "69003"], ["Marseille", "13008"], ["Lille", "59000"], ["Les Lilas", "93260"], ["Créteil", "94000"]];

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const chance = (p: number) => Math.random() < p;
const dOffset = (days: number) => new Date(Date.now() + days * 86_400_000);
const tel = () => `06 ${rnd(10, 99)} ${rnd(10, 99)} ${rnd(10, 99)} ${rnd(10, 99)}`;

const PIECES = ["Pièce d'identité", "Justificatif de domicile", "CV à jour"];

type FormDef = {
  titre: string; reference: string; heures: number; tarif: number;
  examen: boolean; diplomante: boolean; certification: string | null;
};

// Formations par métier (Academy). SAFETY = sécurité/prévention ; TRANSPORT = VTC/taxi.
const FORMATIONS: Record<"SAFETY" | "TRANSPORT", FormDef[]> = {
  SAFETY: [
    { titre: "SST — Sauveteur Secouriste du Travail", reference: "F-SST", heures: 14, tarif: 220, examen: false, diplomante: false, certification: "INRS" },
    { titre: "MAC SST — Maintien des compétences", reference: "F-MACSST", heures: 7, tarif: 190, examen: false, diplomante: false, certification: "INRS" },
    { titre: "TFP APS — Agent de prévention et sécurité", reference: "F-TFPAPS", heures: 175, tarif: 1400, examen: true, diplomante: true, certification: "RNCP1717" },
    { titre: "SSIAP 1 — Agent de sécurité incendie", reference: "F-SSIAP1", heures: 67, tarif: 700, examen: true, diplomante: true, certification: "Arrêté 2 mai 2005" },
    { titre: "Habilitation électrique B0-H0-BS", reference: "F-HABELEC", heures: 21, tarif: 320, examen: false, diplomante: false, certification: "NF C18-510" },
  ],
  TRANSPORT: [
    { titre: "Formation VTC — Préparation examen T3P", reference: "F-VTC", heures: 150, tarif: 1300, examen: true, diplomante: true, certification: "T3P" },
    { titre: "Formation Taxi — Préparation examen T3P", reference: "F-TAXI", heures: 150, tarif: 1300, examen: true, diplomante: true, certification: "T3P" },
    { titre: "Mobilité — Formation continue VTC", reference: "F-FCO-VTC", heures: 14, tarif: 250, examen: false, diplomante: false, certification: "T3P" },
    { titre: "Formation continue Taxi", reference: "F-FCO-TAXI", heures: 14, tarif: 250, examen: false, diplomante: false, certification: "T3P" },
    { titre: "Anglais professionnel du transport de personnes", reference: "F-ANG-VTC", heures: 21, tarif: 300, examen: false, diplomante: false, certification: null },
  ],
};

const CERT = ["CERTIFIE", "AJOURNE", "NON_EVALUE"] as const;

/**
 * Remplit un tenant démo (orgId) avec un jeu réaliste selon le métier (academy).
 * N'écrit QUE dans cet organisme. Idempotent-safe : à n'appeler que sur un tenant
 * fraîchement créé.
 */
export async function seedDemoData(orgId: string, academy: "SAFETY" | "TRANSPORT"): Promise<void> {
  const ac = academy as Academy;

  // Salles
  for (const [nom, capacite] of [["Salle A", 12], ["Salle B", 16], ["Plateau technique", 20]] as [string, number][]) {
    await prisma.salle.create({ data: { organismeId: orgId, nom, capacite, lieu: "Centre de formation", actif: true } });
  }

  // Formateurs
  const formateurIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    const prenom = pick(PRENOMS), nom = pick(NOMS);
    const f = await prisma.formateur.create({
      data: {
        organismeId: orgId, nom, prenom,
        email: `${prenom}.${nom}@demo.local`.toLowerCase().replace(/[^a-z.@]/g, ""),
        telephone: tel(), specialites: academy === "SAFETY" ? "SST, SSIAP, APS" : "VTC, Taxi, T3P",
        academies: { set: [ac] }, tarifJournalier: rnd(250, 450),
      },
      select: { id: true },
    });
    formateurIds.push(f.id);
  }

  // Formations
  const formations: { id: string; examen: boolean; pieces: string[] }[] = [];
  for (const def of FORMATIONS[academy]) {
    const pieces = def.examen ? [...PIECES, "Aptitude médicale"] : PIECES;
    const fo = await prisma.formation.create({
      data: {
        organismeId: orgId, titre: def.titre, reference: def.reference,
        dureeHeures: def.heures, duree: `${def.heures} h`, tarif: def.tarif,
        examen: def.examen, diplomante: def.diplomante, certification: def.certification,
        academy: ac, modalite: "PRESENTIEL",
        objectifs: "Acquérir les compétences réglementaires et pratiques nécessaires à l'exercice du métier, en conformité avec le référentiel.",
        prerequis: "Aptitude médicale. Maîtrise du français (B1).",
        publicVise: "Demandeurs d'emploi, salariés, personnes en reconversion.",
        piecesAttendues: { set: pieces },
      },
      select: { id: true },
    });
    formations.push({ id: fo.id, examen: def.examen, pieces });
  }

  // Candidats (12) — répartis à différents stades
  const candidatIds: string[] = [];
  for (let i = 0; i < 12; i++) {
    const prenom = pick(PRENOMS), nom = pick(NOMS);
    const [ville, cp] = pick(VILLES);
    const c = await prisma.candidat.create({
      data: {
        organismeId: orgId, nom, prenom,
        email: `${prenom}.${nom}.${i}@demo.local`.toLowerCase().replace(/[^a-z0-9.@]/g, ""),
        telephone: tel(), ville, codePostal: cp,
        financementType: pick(["CPF", "OPCO", "FRANCE_TRAVAIL", "AUTOFINANCEMENT", "ENTREPRISE"]),
        statut: pick(["NOUVEAU", "INSCRIT", "INSCRIT"]),
      },
      select: { id: true },
    });
    candidatIds.push(c.id);
  }

  // Sessions (une par formation examinée + quelques autres) + inscriptions
  let ci = 0;
  for (const [idx, f] of formations.entries()) {
    const debut = dOffset(rnd(-40, 40));
    const fin = new Date(debut.getTime() + rnd(1, 5) * 86_400_000);
    const past = fin < new Date();
    const s = await prisma.session.create({
      data: {
        organismeId: orgId, formationId: f.id,
        reference: `S-${1000 + idx}`,
        dateDebut: debut, dateFin: fin, nbPlaces: rnd(8, 14),
        lieu: "Centre de formation", modalite: "PRESENTIEL",
        statut: past ? "TERMINEE" : "PLANIFIEE",
        formateurs: { connect: [{ id: pick(formateurIds) }] },
      },
      select: { id: true },
    });
    // 2-4 inscrits par session
    for (let k = 0; k < rnd(2, 4) && ci < candidatIds.length; k++, ci = (ci + 1) % candidatIds.length) {
      await prisma.inscription.create({
        data: {
          organismeId: orgId, candidatId: candidatIds[ci], sessionId: s.id,
          statut: chance(0.8) ? "VALIDEE" : "EN_ATTENTE",
          financementType: pick(["CPF", "OPCO", "FRANCE_TRAVAIL", "AUTOFINANCEMENT"]),
          resultatCertification: past && f.examen ? pick([...CERT]) : "NON_EVALUE",
        },
      });
    }
  }
}
