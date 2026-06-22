// Ajoute les 3 formations SSIAP 1 (Initial / Recyclage / Remise à niveau) au
// tenant de démo « Sécurité Privée ». Contenu pédagogique réel (programmes
// officiels) — SANS les coordonnées de l'organisme source. Idempotent (repérage
// par référence DEMO-SP-SSIAP1*). Lancer : node scripts/seed-ssiap.cjs
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const METHODES =
  "Fascicule pédagogique remis à l'ouverture du stage. Exercices de mise en pratique " +
  "(manipulation des extincteurs, RIA…). QCM informatiques avec télécommande pour évaluer " +
  "régulièrement les connaissances théoriques. Projection de vidéos sur l'incendie et les " +
  "particularités des ERP et IGH.";

const PUBLIC =
  "Toute personne souhaitant exercer ou conserver la fonction d'agent des services de " +
  "sécurité incendie et d'assistance à personnes (SSIAP 1).";

const PIECES_BASE = [
  "CNI / Passeport / Carte de séjour",
  "Justificatif de domicile",
  "1 photo d'identité",
  "Attestation de secourisme en cours de validité (PSC1 / SST / PSE1)",
  "Certificat d'aptitude médicale",
];
const PIECES_DIPLOME = [...PIECES_BASE, "Copie du diplôme SSIAP 1 (recto-verso)"];

const FORMATIONS = [
  {
    reference: "DEMO-SP-SSIAP1",
    titre: "SSIAP 1 — Agent de Service de Sécurité Incendie et d'Assistance à Personnes (initial)",
    dureeHeures: 67,
    duree: "67 h minimum (hors examen) — 12 personnes maximum",
    examen: true,
    certification: "SSIAP 1 (arrêté du 2 mai 2005 modifié)",
    objectifs:
      "Rendre le stagiaire capable d'assurer la fonction d'Agent de Sécurité Incendie dans un ERP, " +
      "un IGH ou un bâtiment relevant du code du travail ne répondant pas aux dispenses figurant à " +
      "l'article 4 de l'arrêté du 2 mai 2005 modifié.",
    prerequis:
      "Soit AFPS ou PSC1 acquis depuis moins de deux ans, soit CFAPSE, PSE1 ou SST en cours de " +
      "validité. Évaluation de la capacité à retranscrire des anomalies sur une main courante. Aptitude médicale.",
    modalitesEvaluation:
      "Évaluation orale quotidienne par les formateurs et évaluation écrite en fin de formation. " +
      "Examen : 1 QCM de 40 questions et une ronde incendie avec résolution d'un incident.",
    pieces: PIECES_BASE,
    programme: [
      "1. Le feu et ses conséquences (6 h)",
      "   • Le feu et le comportement au feu.",
      "",
      "2. Sécurité incendie (17 h)",
      "   • Principes de classement des établissements.",
      "   • Fondamentaux et principes généraux de sécurité incendie.",
      "   • Desserte des bâtiments. Cloisonnement d'isolation des risques.",
      "   • Évacuation du public et des occupants. Désenfumage. Éclairage de sécurité.",
      "   • Présentation des différents moyens de secours.",
      "",
      "3. Les installations techniques (9 h)",
      "   • Installations électriques. Ascenseurs et nacelles.",
      "   • Installations fixes d'extinction automatique. Colonnes sèches et humides.",
      "   • Système de sécurité incendie.",
      "",
      "4. Rôles et missions des agents de sécurité incendie (18 h)",
      "   • Présentation des consignes de sécurité et main courante. Poste de sécurité.",
      "   • Rondes de sécurité et surveillance des travaux. Mise en œuvre des moyens d'extinction.",
      "   • Appel et réception des services publics de secours. Sensibilisation des occupants.",
      "",
      "5. Concrétisation des acquis (17 h)",
      "   • Visites applicatives. Mises en situation d'intervention.",
    ].join("\n"),
  },
  {
    reference: "DEMO-SP-SSIAP1-REC",
    titre: "SSIAP 1 — Recyclage",
    dureeHeures: 14,
    duree: "14 h — 15 personnes maximum",
    examen: false,
    certification: "SSIAP 1 — recyclage (arrêté du 2 mai 2005 modifié)",
    objectifs: "Permettre au stagiaire de conserver sa qualification SSIAP 1.",
    prerequis:
      "Être titulaire du diplôme SSIAP 1 ou des diplômes ERP et IGH niveau 1. " +
      "Qualification de secourisme en cours de validité.",
    modalitesEvaluation:
      "Mises en situation d'intervention. Délivrance d'une attestation de recyclage SSIAP 1.",
    pieces: PIECES_DIPLOME,
    programme: [
      "1. Prévention (5 h)",
      "   • Évolution de la réglementation en matière de prévention.",
      "",
      "2. Moyens de secours (3 h)",
      "   • Évolution de la réglementation en matière de moyens de secours.",
      "",
      "3. Mise en situation d'intervention (6 h)",
      "   • Conduite à tenir pour procéder à l'extinction d'un début d'incendie.",
      "   • Mise en application globale des acquis opérationnels dans le cadre de l'intervention de l'équipe de sécurité.",
    ].join("\n"),
  },
  {
    reference: "DEMO-SP-SSIAP1-RAN",
    titre: "SSIAP 1 — Remise à niveau",
    dureeHeures: 21,
    duree: "21 h — 15 personnes maximum",
    examen: false,
    certification: "SSIAP 1 — remise à niveau (arrêté du 2 mai 2005 modifié)",
    objectifs: "Permettre au stagiaire de conserver sa qualification SSIAP 1.",
    prerequis:
      "Être titulaire du diplôme SSIAP 1 ou des diplômes ERP1 et IGH1 niveau 1. " +
      "Qualification de secourisme en cours de validité. Certificat médical de moins de trois mois " +
      "pour le personnel n'exerçant pas une fonction dans un service de sécurité incendie.",
    modalitesEvaluation:
      "Mises en situation d'intervention. Délivrance d'une attestation de remise à niveau SSIAP 1.",
    pieces: PIECES_DIPLOME,
    programme: [
      "1. Fondamentaux de sécurité (3 h)",
      "   • Rappels sur les fondamentaux et principes généraux de sécurité incendie au regard du règlement de sécurité.",
      "",
      "2. Prévention (5 h)",
      "   • Évolution de la réglementation en matière de prévention.",
      "",
      "3. Moyens de secours (3 h)",
      "   • Évolution de la réglementation en matière de moyens de secours.",
      "",
      "4. Mise en situation d'intervention (6 h)",
      "   • Conduite à tenir pour procéder à l'extinction d'un début d'incendie.",
      "   • Mise en application globale des acquis opérationnels dans le cadre de l'intervention de l'équipe de sécurité.",
      "",
      "5. Exploitation du PC (2 h)",
      "   • Fonctionnement d'un poste de sécurité. Appel, accueil et guidage des secours publics.",
      "",
      "6. Rondes de sécurité et surveillance des travaux (2 h)",
      "   • Conduite d'une ronde de sécurité.",
    ].join("\n"),
  },
];

(async () => {
  const org = await p.organisme.findUnique({ where: { sousDomaine: "securite-privee" } });
  if (!org) {
    console.error("Tenant 'securite-privee' introuvable — lancer d'abord seed-securite-privee.cjs");
    process.exit(1);
  }
  for (const f of FORMATIONS) {
    const data = {
      organismeId: org.id,
      titre: f.titre,
      dureeHeures: f.dureeHeures,
      duree: f.duree,
      modalite: "PRESENTIEL",
      examen: f.examen,
      certification: f.certification,
      objectifs: f.objectifs,
      programme: f.programme,
      prerequis: f.prerequis,
      publicVise: PUBLIC,
      methodesPedagogiques: METHODES,
      modalitesEvaluation: f.modalitesEvaluation,
      delaiAcces: "Inscription jusqu'à 48 h avant le démarrage de la session.",
      piecesAttendues: f.pieces,
    };
    const exists = await p.formation.findUnique({ where: { reference: f.reference } });
    if (exists) {
      await p.formation.update({ where: { reference: f.reference }, data });
      console.log("Formation mise à jour:", f.reference);
    } else {
      await p.formation.create({ data: { reference: f.reference, ...data } });
      console.log("Formation créée:", f.reference);
    }
  }
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
