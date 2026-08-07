/**
 * CONFIG FORMATIONS — AGUYSE FORMATION.
 * Enrichit les 15 formations de l'org AGUYSE avec le contenu Qualiopi réel
 * (durée, objectifs, prérequis, public, modalités, évaluation, certification,
 * délais d'accès, compétences, description) issu de la source vitrine.
 * Le tarif n'est PAS renseigné (grille tarifaire = à fournir par le client).
 * Idempotent (update par référence). Usage : node scripts/configure-aguyse-formations.cjs
 */
const { readFileSync } = require("node:fs");
const path = require("node:path");
const env = {};
try {
  for (const l of readFileSync(path.join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[m[1]] = v; }
  }
} catch {}
process.env.DATABASE_URL = env.DIRECT_URL || env.DATABASE_URL || process.env.DATABASE_URL;

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

// Rempli depuis l'extraction de data/safety-formations.ts (vitrine).
const DATA = [
  {
    "slug": "tfp-aps-agent-prevention-securite",
    "title": "Agent de Sécurité et de Surveillance Humaine (TFP APS)",
    "tagline": "Devenez agent de sécurité et obtenez votre carte professionnelle CNAPS",
    "description": "Formation initiale hybride (e-learning + présentiel) préparant au métier d'agent de sécurité et de surveillance humaine : gardiennage, contrôle d'accès, événementiel, télésurveillance. Ce titre certifiant, enregistré au RNCP sous le n° 40375, ouvre droit à la carte professionnelle délivrée par le CNAPS et permet d'exercer légalement.",
    "duree": "175 heures : 70 h en e-learning (à distance) + 105 h en présentiel (hors examen)",
    "validite": "Carte professionnelle valable 5 ans, renouvelable via le stage de recyclage MAC APS avant l'échéance.",
    "certification": "Titre à Finalité Professionnelle « Agent de Sécurité et de Surveillance Humaine », enregistré au Répertoire National des Certifications Professionnelles sous le n° RNCP 40375 (niveau 3). Certificateur : Scotia Groupe. Formation conforme à l'arrêté du 27 juin 2017. Ouvre droit à la carte professionnelle délivrée par le CNAPS.",
    "objectifs": [
      "Exercer le métier d'agent de sécurité et de surveillance humaine dans le respect du cadre légal",
      "Obtenir le TFP « Agent de Sécurité et de Surveillance Humaine » (RNCP 40375) et la carte professionnelle CNAPS",
      "Assurer la sécurité des personnes et des biens : surveillance, contrôle d'accès, rondes, gestion des risques et des situations d'urgence"
    ],
    "competences": [
      "Analyser et appliquer la réglementation de la sécurité privée (livre VI du Code de la sécurité intérieure) et la déontologie",
      "Réaliser un filtrage, un contrôle d'accès, une palpation de sécurité et l'inspection visuelle des bagages",
      "Effectuer des rondes de surveillance et des rondes techniques",
      "Appliquer les mesures de prévention des risques terroristes et réagir face à une menace",
      "Prévenir et gérer les situations conflictuelles, y compris dégradées",
      "Assurer les gestes de premiers secours (Sauveteur Secouriste du Travail — SST)",
      "Utiliser les systèmes de surveillance électronique, la télésurveillance et la vidéoprotection"
    ],
    "public": "Toute personne souhaitant s'orienter ou se reconvertir vers les métiers de la sécurité privée (demandeurs d'emploi, salariés en reconversion) et obtenir la carte professionnelle CNAPS.",
    "prerequis": "Être majeur ; être de nationalité française, ressortissant de l'UE/EEE ou étranger justifiant d'un titre de séjour (5 ans de présence autorisant une activité salariée) ; disposer du numéro d'autorisation préalable délivré par le CNAPS (obligatoire avant l'entrée en formation) ou d'une carte professionnelle à jour ; présenter un casier judiciaire compatible ; justifier d'un niveau de français B1 (oral et écrit) ; avis favorable à l'entretien préalable.",
    "modalites": "Formation HYBRIDE de 175 heures : une partie théorique de 70 h en e-learning à distance, sur la plateforme du certificateur (Scotia Groupe), puis 105 h en présentiel dans nos locaux (mises en situation, pratique, entraînement aux épreuves). Accessibilité étudiée au cas par cas avec notre référent handicap.",
    "evaluation": "Examen final conforme au référentiel de certification : épreuves écrites (QCU/QCM) et mises en situation professionnelle, évaluées par un jury, couvrant l'ensemble des activités du titre (dont le SST). La validation de toutes les activités est requise pour obtenir la certification ; les épreuves non validées peuvent être repassées lors d'une session ultérieure.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "1 400 € HT — net de taxe (TVA non applicable, article 261-4-4°a du CGI). Prise en charge possible : CPF, France Travail, OPCO ou plan de développement des compétences de l'entreprise."
  },
  {
    "slug": "mac-aps-recyclage",
    "title": "Maintien et Actualisation des Compétences — Agent de Prévention et de Sécurité (MAC APS)",
    "tagline": "Renouvelez votre carte professionnelle d'agent de sécurité",
    "description": "Stage de recyclage obligatoire permettant à l'agent de prévention et de sécurité de maintenir et d'actualiser ses compétences pour renouveler sa carte professionnelle délivrée par le CNAPS.",
    "duree": "31 heures",
    "validite": "Renouvelle la carte professionnelle pour 5 ans. À suivre avant l'échéance de la carte en cours.",
    "certification": "Attestation de Maintien et d'Actualisation des Compétences (MAC APS). Permet le renouvellement de la carte professionnelle délivrée par le CNAPS pour une nouvelle période de 5 ans.",
    "objectifs": [
      "Maintenir et actualiser les compétences réglementaires de l'agent de prévention et de sécurité",
      "Renouveler sa carte professionnelle CNAPS",
      "Mettre à jour ses connaissances du cadre légal et des gestes de premiers secours"
    ],
    "competences": [
      "Actualiser sa connaissance du cadre juridique de la sécurité privée",
      "Maintenir les gestes de premiers secours (recyclage SST / PSE1)",
      "Réviser la gestion des conflits et la prévention des risques d'incendie"
    ],
    "public": "Agents de prévention et de sécurité titulaires d'une carte professionnelle (en cours de validité ou expirée) devant renouveler leur autorisation d'exercer.",
    "prerequis": "Être ou avoir été titulaire d'une carte professionnelle d'agent de prévention et de sécurité.",
    "modalites": "Formation en présentiel dans nos locaux, en sessions inter-entreprises. Pédagogie active centrée sur l'actualisation des acquis. Accessibilité étudiée avec notre référent handicap.",
    "evaluation": "Évaluation continue des acquis au cours du stage (secourisme, cadre légal, gestion des conflits, incendie). Délivrance de l'attestation MAC APS permettant le renouvellement de la carte professionnelle.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "sst-sauveteur-secouriste-travail",
    "title": "Sauveteur Secouriste du Travail (SST)",
    "tagline": "Savoir intervenir face à un accident du travail",
    "description": "Devenez Sauveteur Secouriste du Travail : porter secours à une victime, donner l'alerte et participer à la prévention des risques dans votre entreprise. Formation conforme au référentiel national de l'INRS et du réseau Assurance Maladie – Risques professionnels.",
    "duree": "14h (2 jours)",
    "validite": "24 mois — un maintien et actualisation des compétences (MAC SST, 7h) doit être suivi avant l'échéance pour renouveler le certificat.",
    "certification": "Certificat SST délivré sous l'égide de l'INRS et de l'Assurance Maladie – Risques professionnels. Le certificat vaut, dans la limite de sa durée de validité, attestation de formation aux premiers secours et permet l'utilisation d'un défibrillateur.",
    "objectifs": [
      "Maîtriser la conduite à tenir et les gestes de premiers secours",
      "Intervenir efficacement face à une situation d'accident du travail",
      "Contribuer à la prévention des risques professionnels dans l'entreprise"
    ],
    "competences": [
      "Protéger, examiner, alerter et secourir une victime",
      "Réaliser les gestes de premiers secours adaptés à l'état de la victime",
      "Repérer les situations dangereuses et remonter l'information dans l'entreprise"
    ],
    "public": "Tout salarié désigné par l'employeur pour devenir Sauveteur Secouriste du Travail. La présence d'un SST est requise sur les chantiers et dans les ateliers où sont effectués des travaux dangereux (art. R4224-15 du Code du travail).",
    "prerequis": "Aucun prérequis. Maîtrise du français (oral et écrit) recommandée.",
    "modalites": "Formation en présentiel, en INTRA-entreprise (dans vos locaux) ou en EXTRA-entreprise (sessions inter-entreprises dans nos locaux). Possibilité de former directement sur le site du client. Pédagogie active avec mises en situation et cas pratiques.",
    "evaluation": "Évaluation continue tout au long de la formation, complétée par deux épreuves certificatives sur mises en situation d'accident, conformément au référentiel INRS. Délivrance du certificat SST (valable 24 mois) en cas de réussite ; sinon, une attestation de suivi est remise.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "mac-sst-recyclage",
    "title": "Maintien et Actualisation des Compétences SST (MAC SST)",
    "tagline": "Renouvelez votre certificat SST",
    "description": "Recyclage obligatoire des Sauveteurs Secouristes du Travail : réviser les gestes de secours, intégrer les évolutions du référentiel et actualiser ses compétences pour renouveler son certificat pour 24 mois.",
    "duree": "7h (1 jour)",
    "validite": "24 mois — à renouveler par un nouveau MAC SST avant l'échéance.",
    "certification": "Renouvellement du certificat SST (INRS / Assurance Maladie – Risques professionnels) pour une nouvelle période de 24 mois.",
    "objectifs": [
      "Actualiser ses compétences de Sauveteur Secouriste du Travail",
      "Réviser les gestes d'urgence et la conduite à tenir",
      "Maintenir sa capacité à intervenir et à prévenir les risques"
    ],
    "competences": [
      "Réviser le protocole protéger-examiner-alerter-secourir",
      "Mettre à jour ses gestes de premiers secours",
      "Intégrer les évolutions des recommandations et des risques de l'entreprise"
    ],
    "public": "Tout titulaire d'un certificat SST devant renouveler ses compétences avant l'échéance des 24 mois.",
    "prerequis": "Être titulaire du certificat SST. En cas de certificat expiré, le MAC reste possible mais une remise à niveau peut être conseillée.",
    "modalites": "Formation en présentiel, en INTRA-entreprise (dans vos locaux) ou en EXTRA-entreprise (sessions inter-entreprises dans nos locaux). Possibilité de former directement sur le site du client. Pédagogie active avec mises en situation et cas pratiques.",
    "evaluation": "Évaluation continue selon les deux domaines de compétences du référentiel INRS. Renouvellement du certificat SST (valable 24 mois) en cas de réussite.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "habilitation-electrique-h0b0",
    "title": "Habilitation électrique H0 – B0 (personnel non-électricien)",
    "tagline": "Travailler en sécurité en environnement électrique",
    "description": "Préparation à l'habilitation électrique H0-B0 selon la norme NF C18-510, pour le personnel non-électricien amené à réaliser des travaux d'ordre non électrique (peinture, nettoyage, maçonnerie, manutention…) dans un environnement présentant un risque électrique.",
    "duree": "7h (1 jour)",
    "validite": "Recyclage recommandé tous les 3 ans (NF C18-510), ramené à 2 ans en cas de pratique occasionnelle. L'employeur assure un suivi annuel de l'adéquation du titre avec l'activité réelle.",
    "certification": "Avis après formation permettant à l'employeur de délivrer le titre d'habilitation, conformément à la norme NF C18-510 (obligation issue de l'article R4544-9 du Code du travail). Symboles visés : H0 / H0V (haute tension) et B0 (basse tension).",
    "objectifs": [
      "Identifier les dangers de l'électricité et les zones à risque",
      "Adopter un comportement adapté en environnement électrique",
      "Exécuter en sécurité des travaux d'ordre non électrique"
    ],
    "competences": [
      "Connaître les dangers du courant électrique et leurs effets sur le corps humain",
      "Repérer les zones d'environnement et respecter les limites et distances de sécurité",
      "Appliquer les prescriptions de la norme NF C18-510 pour un personnel non-électricien"
    ],
    "public": "Personnel non-électricien appelé à travailler dans des locaux ou zones présentant des risques électriques (agents de nettoyage, peintres, maçons, manutentionnaires, personnel de maintenance non électrique…).",
    "prerequis": "Aucune connaissance en électricité requise. Maîtrise des savoirs de base (lire, écrire, comprendre les consignes de sécurité en français).",
    "modalites": "Formation en présentiel, en INTRA-entreprise (dans vos locaux) ou en EXTRA-entreprise (sessions inter-entreprises dans nos locaux). Possibilité de former directement sur le site du client. Pédagogie active avec mises en situation et cas pratiques.",
    "evaluation": "Évaluation théorique (QCM) et évaluation pratique des savoir-faire et savoir-être. Remise d'un avis après formation, support de l'habilitation délivrée par l'employeur.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "habilitation-electrique-bs-be-manoeuvre",
    "title": "Habilitation électrique BS – BE Manœuvre",
    "tagline": "Interventions élémentaires et manœuvres en basse tension",
    "description": "Préparation à l'habilitation électrique BS (interventions de remplacement et de raccordement) et BE Manœuvre (manœuvres d'exploitation) selon la norme NF C18-510, pour le personnel réalisant des opérations simples sur des installations basse tension.",
    "duree": "14h (2 jours)",
    "validite": "Recyclage recommandé tous les 3 ans (NF C18-510), ramené à 2 ans en cas de pratique occasionnelle. Suivi annuel par l'employeur de l'adéquation du titre avec l'activité.",
    "certification": "Avis après formation permettant à l'employeur de délivrer le titre d'habilitation, conformément à la norme NF C18-510 (art. R4544-9 du Code du travail). Symboles visés : BS (intervention élémentaire) et BE Manœuvre.",
    "objectifs": [
      "Identifier les dangers de l'électricité et évaluer les risques",
      "Réaliser en sécurité des interventions élémentaires (BS) et des manœuvres (BE Manœuvre)",
      "Appliquer les prescriptions de la norme NF C18-510"
    ],
    "competences": [
      "Connaître les dangers du courant et les mesures de protection",
      "Réaliser une intervention de remplacement et de raccordement (BS) en sécurité",
      "Réaliser des manœuvres d'exploitation et de consignation (BE Manœuvre)"
    ],
    "public": "Personnel électricien ou non-électricien réalisant des interventions simples de remplacement/raccordement (BS) ou des manœuvres d'exploitation (BE Manœuvre) : agents de maintenance, gardiens, techniciens, personnel d'exploitation.",
    "prerequis": "Disposer de notions de base en électricité et savoir lire les consignes de sécurité. Une expérience pratique des installations concernées est recommandée.",
    "modalites": "Formation en présentiel, en INTRA-entreprise (dans vos locaux) ou en EXTRA-entreprise (sessions inter-entreprises dans nos locaux). Possibilité de former directement sur le site du client. Pédagogie active avec mises en situation et cas pratiques.",
    "evaluation": "Évaluation théorique (QCM) et évaluation pratique sur installations (remplacement, raccordement, manœuvres). Remise d'un avis après formation, support de l'habilitation délivrée par l'employeur.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "ssiap-1-initial",
    "title": "SSIAP 1 — Agent de service de sécurité incendie (initial)",
    "tagline": "Devenez agent de sécurité incendie (SSIAP 1)",
    "description": "Formation initiale au métier d'agent de service de sécurité incendie et d'assistance à personnes dans les établissements recevant du public (ERP) et les immeubles de grande hauteur (IGH).",
    "duree": "67 heures (hors temps d'examen)",
    "validite": "Maintenu par un recyclage tous les 3 ans ; une remise à niveau est requise en cas d'interruption d'activité au-delà des délais réglementaires.",
    "certification": "Diplôme SSIAP 1 (arrêté du 2 mai 2005 modifié), reconnu par le ministère de l'Intérieur. Permet d'exercer comme agent de service de sécurité incendie (SSIAP).",
    "objectifs": [
      "Assurer la sécurité incendie et l'assistance à personnes dans un ERP ou un IGH",
      "Prévenir les risques d'incendie et sensibiliser les occupants",
      "Alerter et accueillir les secours, exploiter le poste de sécurité"
    ],
    "competences": [
      "Connaître le comportement du feu et les principes de la sécurité incendie",
      "Appliquer la réglementation ERP/IGH et repérer les moyens de secours",
      "Effectuer les rondes, lever un doute et intervenir sur un début d'incendie",
      "Exploiter le poste central de sécurité et déclencher l'alerte"
    ],
    "public": "Toute personne souhaitant exercer le métier d'agent de sécurité incendie (SSIAP 1).",
    "prerequis": "Aptitude médicale de moins de 3 mois attestant de la compatibilité avec l'emploi ; formation aux premiers secours (SST, PSC1 ou PSE1) en cours de validité ; savoir lire, écrire et s'exprimer en français.",
    "modalites": "Formation en présentiel en centre agréé, incluant exercices pratiques sur feux réels et mises en situation. Accessibilité étudiée avec notre référent handicap.",
    "evaluation": "Examen conforme à l'arrêté du 2 mai 2005 : épreuve écrite (QCM de 30 questions) et épreuve pratique (ronde avec anomalies et action face à un sinistre) évaluées par un jury. Délivrance du diplôme SSIAP 1 en cas de réussite.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "ssiap-1-remise-a-niveau",
    "title": "SSIAP 1 — Remise à niveau",
    "tagline": "Reprenez votre activité d'agent de sécurité incendie",
    "description": "Formation de remise à niveau destinée aux titulaires du SSIAP 1 ne pouvant justifier de l'exercice de l'emploi ou du recyclage dans les délais réglementaires, afin de reprendre leur activité.",
    "duree": "21 heures (3 jours)",
    "validite": "Un recyclage reste ensuite exigé tous les 3 ans.",
    "certification": "Attestation de remise à niveau SSIAP 1 (arrêté du 2 mai 2005 modifié). Rétablit la validité du diplôme SSIAP 1.",
    "objectifs": [
      "Remettre à niveau les compétences de l'agent de sécurité incendie SSIAP 1",
      "Réactualiser la réglementation et les techniques d'intervention",
      "Permettre la reprise de l'activité dans les règles"
    ],
    "competences": [
      "Réactualiser la prévention et la réglementation de sécurité incendie",
      "Réviser les moyens de secours et l'intervention",
      "Réexploiter le poste central de sécurité"
    ],
    "public": "Agents titulaires du SSIAP 1 n'ayant pas exercé l'emploi ou n'ayant pas suivi leur recyclage dans les délais réglementaires.",
    "prerequis": "Être titulaire du diplôme SSIAP 1 ; aptitude médicale de moins de 3 mois ; formation aux premiers secours en cours de validité.",
    "modalites": "Formation en présentiel en centre agréé, à dominante pratique. Accessibilité étudiée avec notre référent handicap.",
    "evaluation": "Évaluation continue des acquis (pas d'examen final). Délivrance d'une attestation de remise à niveau rétablissant la validité du diplôme.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "ssiap-1-recyclage",
    "title": "SSIAP 1 — Recyclage",
    "tagline": "Maintenez votre diplôme SSIAP 1 à jour",
    "description": "Recyclage triennal obligatoire permettant à l'agent de sécurité incendie de maintenir et d'actualiser ses compétences pour continuer à exercer.",
    "duree": "21 heures (3 jours)",
    "validite": "À renouveler tous les 3 ans.",
    "certification": "Attestation de recyclage SSIAP 1 (arrêté du 2 mai 2005 modifié). Permet le maintien du diplôme SSIAP 1.",
    "objectifs": [
      "Maintenir et actualiser les compétences de l'agent de sécurité incendie SSIAP 1",
      "Actualiser ses connaissances réglementaires et techniques",
      "Réentraîner les gestes d'intervention et l'exploitation du poste de sécurité"
    ],
    "competences": [
      "Actualiser la prévention et la réglementation de sécurité incendie",
      "Maîtriser les moyens de secours et l'intervention sur un début d'incendie",
      "Exploiter le poste central de sécurité en situation"
    ],
    "public": "Agents titulaires du diplôme SSIAP 1 (ou équivalent ERP 2 / IGH 2) devant effectuer leur recyclage.",
    "prerequis": "Être titulaire du diplôme SSIAP 1 (ou d'une équivalence) ; aptitude médicale de moins de 3 mois ; formation aux premiers secours en cours de validité.",
    "modalites": "Formation en présentiel en centre agréé, à dominante pratique. Accessibilité étudiée avec notre référent handicap.",
    "evaluation": "Évaluation continue des acquis au cours du recyclage (pas d'examen final). Délivrance d'une attestation de recyclage maintenant le diplôme SSIAP 1.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "ssiap-2-initial",
    "title": "SSIAP 2 — Chef d'équipe de sécurité incendie (initial)",
    "tagline": "Encadrez une équipe de sécurité incendie (SSIAP 2)",
    "description": "Formation initiale au métier de chef d'équipe de sécurité incendie : encadrement d'une équipe d'agents SSIAP, management du poste de sécurité et gestion d'une situation de crise dans un ERP ou un IGH.",
    "duree": "70 heures (hors temps d'examen)",
    "validite": "Maintenu par un recyclage tous les 3 ans ; remise à niveau requise en cas d'interruption d'activité.",
    "certification": "Diplôme SSIAP 2 (arrêté du 2 mai 2005 modifié), reconnu par le ministère de l'Intérieur. Permet d'exercer comme chef d'équipe de sécurité incendie.",
    "objectifs": [
      "Manager une équipe de sécurité incendie",
      "Gérer le poste central de sécurité, y compris en situation de crise",
      "Assurer le suivi des installations de sécurité et le respect des consignes"
    ],
    "competences": [
      "Encadrer, animer et former une équipe d'agents de sécurité incendie",
      "Manipuler et exploiter le système de sécurité incendie (SSI)",
      "Appliquer les règles d'hygiène et de sécurité du travail",
      "Diriger le poste central de sécurité en situation d'urgence"
    ],
    "public": "Agents de sécurité incendie (SSIAP 1) souhaitant évoluer vers la fonction de chef d'équipe.",
    "prerequis": "Être titulaire du SSIAP 1 et justifier de 1 607 heures d'exercice de l'emploi (ou d'un diplôme équivalent) ; formation aux premiers secours (SST/PSE1) en cours de validité ; aptitude médicale de moins de 3 mois.",
    "modalites": "Formation en présentiel en centre agréé, avec exercices pratiques et mises en situation de management. Accessibilité étudiée avec notre référent handicap.",
    "evaluation": "Examen conforme à l'arrêté du 2 mai 2005 : épreuve écrite (QCM) et animation d'une séquence pédagogique / gestion d'une situation évaluées par un jury. Délivrance du diplôme SSIAP 2 en cas de réussite.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "ssiap-2-remise-a-niveau",
    "title": "SSIAP 2 — Remise à niveau",
    "tagline": "Reprenez votre fonction de chef d'équipe de sécurité incendie",
    "description": "Formation de remise à niveau destinée aux titulaires du SSIAP 2 ne pouvant justifier de l'exercice de l'emploi ou du recyclage dans les délais réglementaires.",
    "duree": "21 heures (3 jours)",
    "validite": "Un recyclage reste ensuite exigé tous les 3 ans.",
    "certification": "Attestation de remise à niveau SSIAP 2 (arrêté du 2 mai 2005 modifié). Rétablit la validité du diplôme SSIAP 2.",
    "objectifs": [
      "Remettre à niveau les compétences du chef d'équipe SSIAP 2",
      "Réactualiser la réglementation et le management de la sécurité incendie",
      "Permettre la reprise de la fonction dans les règles"
    ],
    "competences": [
      "Réactualiser la réglementation de sécurité incendie",
      "Réviser le management d'équipe et l'exploitation du SSI",
      "Regérer le poste central de sécurité"
    ],
    "public": "Chefs d'équipe titulaires du SSIAP 2 n'ayant pas exercé l'emploi ou n'ayant pas suivi leur recyclage dans les délais réglementaires.",
    "prerequis": "Être titulaire du diplôme SSIAP 2 ; aptitude médicale de moins de 3 mois ; formation aux premiers secours en cours de validité.",
    "modalites": "Formation en présentiel en centre agréé, à dominante pratique. Accessibilité étudiée avec notre référent handicap.",
    "evaluation": "Évaluation continue des acquis (pas d'examen final). Délivrance d'une attestation de remise à niveau rétablissant la validité du diplôme.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "ssiap-2-recyclage",
    "title": "SSIAP 2 — Recyclage",
    "tagline": "Maintenez votre diplôme SSIAP 2 à jour",
    "description": "Recyclage triennal obligatoire permettant au chef d'équipe de sécurité incendie de maintenir et d'actualiser ses compétences.",
    "duree": "21 heures (3 jours)",
    "validite": "À renouveler tous les 3 ans.",
    "certification": "Attestation de recyclage SSIAP 2 (arrêté du 2 mai 2005 modifié). Permet le maintien du diplôme SSIAP 2.",
    "objectifs": [
      "Maintenir et actualiser les compétences du chef d'équipe SSIAP 2",
      "Actualiser la réglementation et les techniques de management de la sécurité",
      "Réentraîner la gestion du poste central de sécurité"
    ],
    "competences": [
      "Actualiser la réglementation de sécurité incendie",
      "Réviser le management de l'équipe et l'exploitation du SSI",
      "Gérer le poste central de sécurité en situation"
    ],
    "public": "Chefs d'équipe titulaires du diplôme SSIAP 2 devant effectuer leur recyclage.",
    "prerequis": "Être titulaire du diplôme SSIAP 2 ; aptitude médicale de moins de 3 mois ; formation aux premiers secours en cours de validité.",
    "modalites": "Formation en présentiel en centre agréé, à dominante pratique. Accessibilité étudiée avec notre référent handicap.",
    "evaluation": "Évaluation continue des acquis (pas d'examen final). Délivrance d'une attestation de recyclage maintenant le diplôme SSIAP 2.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "ssiap-3-initial",
    "title": "SSIAP 3 — Chef de service de sécurité incendie (initial)",
    "tagline": "Dirigez un service de sécurité incendie (SSIAP 3)",
    "description": "Formation initiale au métier de chef de service de sécurité incendie : management du service, conseil au chef d'établissement et suivi des obligations réglementaires en ERP et IGH.",
    "duree": "216 heures (hors temps d'examen)",
    "validite": "Maintenu par un recyclage tous les 3 ans ; remise à niveau requise en cas d'interruption d'activité.",
    "certification": "Diplôme SSIAP 3 (arrêté du 2 mai 2005 modifié), reconnu par le ministère de l'Intérieur. Permet d'exercer comme chef de service de sécurité incendie.",
    "objectifs": [
      "Manager le service de sécurité incendie d'un établissement",
      "Conseiller le chef d'établissement en matière de sécurité incendie",
      "Assurer le suivi des obligations réglementaires et des commissions de sécurité"
    ],
    "competences": [
      "Maîtriser la réglementation applicable (ERP, IGH, Code du travail, habitation)",
      "Analyser et gérer les risques d'incendie et de panique",
      "Manager le service de sécurité et gérer son budget",
      "Assurer le rôle de correspondant des commissions de sécurité"
    ],
    "public": "Chefs d'équipe SSIAP 2 expérimentés ou personnes titulaires d'un diplôme de niveau 4 souhaitant devenir chef de service de sécurité incendie.",
    "prerequis": "Être titulaire d'un diplôme de niveau 4 minimum OU du SSIAP 2 avec 3 ans d'exercice de l'emploi ; formation aux premiers secours (SST/PSE1) en cours de validité ; aptitude médicale de moins de 3 mois.",
    "modalites": "Formation en présentiel en centre agréé, alternant apports réglementaires, études de cas et projets. Accessibilité étudiée avec notre référent handicap.",
    "evaluation": "Examen conforme à l'arrêté du 2 mai 2005 : épreuve écrite (QCM), rédaction d'une note et soutenance orale devant un jury. Délivrance du diplôme SSIAP 3 en cas de réussite.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "ssiap-3-remise-a-niveau",
    "title": "SSIAP 3 — Remise à niveau",
    "tagline": "Reprenez votre fonction de chef de service de sécurité incendie",
    "description": "Formation de remise à niveau destinée aux titulaires du SSIAP 3 ne pouvant justifier de l'exercice de l'emploi ou du recyclage dans les délais réglementaires.",
    "duree": "35 heures (5 jours)",
    "validite": "Un recyclage reste ensuite exigé tous les 3 ans.",
    "certification": "Attestation de remise à niveau SSIAP 3 (arrêté du 2 mai 2005 modifié). Rétablit la validité du diplôme SSIAP 3.",
    "objectifs": [
      "Remettre à niveau les compétences du chef de service SSIAP 3",
      "Réactualiser la réglementation et l'analyse des risques",
      "Permettre la reprise de la fonction dans les règles"
    ],
    "competences": [
      "Réactualiser la réglementation de sécurité incendie",
      "Réviser la gestion des risques et les documents de sécurité",
      "Réviser le management du service de sécurité"
    ],
    "public": "Chefs de service titulaires du SSIAP 3 n'ayant pas exercé l'emploi ou n'ayant pas suivi leur recyclage dans les délais réglementaires.",
    "prerequis": "Être titulaire du diplôme SSIAP 3 ; aptitude médicale de moins de 3 mois ; formation aux premiers secours en cours de validité.",
    "modalites": "Formation en présentiel en centre agréé. Accessibilité étudiée avec notre référent handicap.",
    "evaluation": "Évaluation continue des acquis (pas d'examen final). Délivrance d'une attestation de remise à niveau rétablissant la validité du diplôme.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  },
  {
    "slug": "ssiap-3-recyclage",
    "title": "SSIAP 3 — Recyclage",
    "tagline": "Maintenez votre diplôme SSIAP 3 à jour",
    "description": "Recyclage triennal obligatoire permettant au chef de service de sécurité incendie de maintenir et d'actualiser ses compétences.",
    "duree": "35 heures (5 jours)",
    "validite": "À renouveler tous les 3 ans.",
    "certification": "Attestation de recyclage SSIAP 3 (arrêté du 2 mai 2005 modifié). Permet le maintien du diplôme SSIAP 3.",
    "objectifs": [
      "Maintenir et actualiser les compétences du chef de service SSIAP 3",
      "Actualiser la réglementation et l'analyse des risques",
      "Réviser le management du service et le conseil au chef d'établissement"
    ],
    "competences": [
      "Actualiser la réglementation de sécurité incendie (ERP, IGH, Code du travail)",
      "Réviser la gestion des risques et l'analyse des documents de sécurité",
      "Réviser le management du service et son budget"
    ],
    "public": "Chefs de service titulaires du diplôme SSIAP 3 devant effectuer leur recyclage.",
    "prerequis": "Être titulaire du diplôme SSIAP 3 ; aptitude médicale de moins de 3 mois ; formation aux premiers secours en cours de validité.",
    "modalites": "Formation en présentiel en centre agréé. Accessibilité étudiée avec notre référent handicap.",
    "evaluation": "Évaluation continue des acquis (pas d'examen final). Délivrance d'une attestation de recyclage maintenant le diplôme SSIAP 3.",
    "delaiAcces": "Sessions planifiées toute l'année. En intra : organisation selon vos disponibilités, mise en place sous 11 jours ouvrés après validation du devis.",
    "tarif": "Sur devis — net de taxe (TVA non applicable, article 261-4-4°a du CGI)."
  }
];

// ── Inférences réglementaires par slug ──
// Examen sanctionné par jury + titre diplômant = uniquement les formations
// INITIALES (SSIAP 1/2/3 initial) et le TFP APS. Recyclages / remises à niveau /
// MAC = évaluation continue (pas d'examen final, pas de diplôme délivré).
const isExamen = (s) => /(ssiap-\d-initial)|^tfp-aps/.test(s);
const isDiplomante = (s) => /(ssiap-\d-initial)|^tfp-aps/.test(s);
function dureeHeuresFrom(duree) {
  if (!duree) return null;
  const m = String(duree).match(/(\d+)\s*(h|heure)/i);
  return m ? parseInt(m[1], 10) : null;
}
const joinBullets = (arr) => (Array.isArray(arr) && arr.length ? arr.map((x) => `• ${x}`).join("\n") : null);

(async () => {
  const org = await p.organisme.findFirst({ where: { nom: "AGUYSE FORMATION" }, select: { id: true } });
  if (!org) { console.error("STOP : organisme AGUYSE FORMATION introuvable."); process.exit(1); }
  const OID = org.id;
  if (!DATA.length) { console.error("STOP : DATA vide — remplir le tableau des 15 formations."); process.exit(1); }

  let updated = 0, missing = [];
  for (const f of DATA) {
    const found = await p.formation.findFirst({ where: { organismeId: OID, reference: f.slug }, select: { id: true } });
    if (!found) { missing.push(f.slug); continue; }
    await p.formation.update({
      where: { id: found.id },
      data: {
        titre: f.title ?? undefined,
        objectifs: joinBullets(f.objectifs) ?? undefined,
        duree: f.duree ?? undefined,
        dureeHeures: dureeHeuresFrom(f.duree) ?? undefined,
        modalite: "PRESENTIEL",
        prerequis: f.prerequis ?? undefined,
        publicVise: f.public ?? undefined,
        methodesPedagogiques: f.modalites ?? undefined,
        modalitesEvaluation: f.evaluation ?? undefined,
        certification: f.certification ?? undefined,
        delaiAcces: f.delaiAcces ?? undefined,
        examen: isExamen(f.slug),
        diplomante: isDiplomante(f.slug),
        vitrineTagline: f.tagline ?? undefined,
        vitrineDescription: f.description ?? undefined,
        vitrineCompetences: Array.isArray(f.competences) ? { set: f.competences } : undefined,
        vitrineValidite: f.validite ?? undefined,
        vitrineModalites: f.modalites ?? undefined,
      },
    });
    updated++;
  }
  console.log(`✅ Formations mises à jour : ${updated}/${DATA.length}`);
  if (missing.length) console.log("⚠️  Références introuvables (à vérifier) :", missing.join(", "));
  await p.$disconnect();
})().catch(async (e) => { console.error("ERREUR :", e); try { await p.$disconnect(); } catch {} process.exit(1); });
