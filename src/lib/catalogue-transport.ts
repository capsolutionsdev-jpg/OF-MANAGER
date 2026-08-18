// =============================================================
//  Catalogue de RÉFÉRENCE des formations transport de personnes (T3P).
//
//  Même principe que lib/catalogue-securite.ts : modèles réglementaires
//  communs à tout OFManager, activables par organisme depuis la console dev
//  (provisionnement). Contenus alignés sur l'arrêté du 11 août 2017 (formation
//  continue VTC/taxi 14 h tous les 5 ans) et le cadre T3P (passerelles avec
//  épreuves d'admission organisées par la CMA).
//
//  Règle métier : formations continues, passerelles et TPMR = PAS d'examen
//  interne ni de jury OF (les épreuves des passerelles sont gérées par la CMA ;
//  l'initial VTC/Taxi passe par le parcours T3P dédié).
// =============================================================

import type { ModeleFormation } from "@/lib/catalogue-securite";

const PIECES_TRANSPORT_BASE = [
  "Pièce d'identité en cours de validité",
  "Justificatif de domicile",
  "1 photo d'identité",
  "Permis de conduire en cours de validité",
];

export const CATALOGUE_TRANSPORT: ModeleFormation[] = [
  // ───────────────────────── Formations INITIALES (préparation à l'examen T3P / CMA) ─────────────────────────
  // Le titre contient « VTC » (resp. « TAXI ») sans l'autre terme → à l'inscription,
  // le parcours d'examen T3P dédié s'ouvre automatiquement avec le bon métier
  // (cf. t3pMetierOfFormation). Épreuves organisées par la CMA → pas d'examen ni de
  // jury internes à l'OF (comme les passerelles).
  {
    cle: "vtc-initial",
    reference: "VTC-INIT",
    titre: "Formation initiale VTC — Préparation à l'examen T3P",
    alias: [
      "VTC initial",
      "Formation initiale VTC",
      "Préparation examen VTC",
      "Formation VTC",
      "Carte professionnelle VTC",
    ],
    dureeHeures: 140,
    duree: "Durée indicative (à adapter au format et au niveau du candidat)",
    examen: false, // épreuves d'admissibilité et d'admission organisées par la CMA
    soumisJury: false,
    certification:
      "Préparation à l'examen d'accès à la profession de chauffeur VTC (transport public particulier de " +
      "personnes – T3P), organisé par la Chambre de Métiers et de l'Artisanat (CMA) : épreuve théorique " +
      "d'admissibilité (tronc commun T3P + spécifique VTC) puis épreuve pratique d'admission. La carte " +
      "professionnelle VTC est délivrée par la préfecture après réussite.",
    objectifs:
      "Maîtriser la réglementation du transport public particulier de personnes et la réglementation " +
      "spécifique VTC, la sécurité routière, la relation client et la gestion d'une activité VTC, afin de " +
      "réussir les épreuves d'admissibilité et d'admission de l'examen T3P.",
    prerequis:
      "Être titulaire du permis B en cours de validité depuis plus de 3 ans (2 ans en conduite " +
      "accompagnée), présenter un casier judiciaire (bulletin n°2) compatible avec la profession, une " +
      "attestation d'aptitude médicale (visite médicale en préfecture) et le certificat PSC1 (secours).",
    programme: [
      "Tronc commun T3P",
      "1. Réglementation du transport public particulier de personnes (T3P)",
      "2. Sécurité routière",
      "3. Gestion et développement de l'entreprise (statut, comptabilité, obligations)",
      "4. Français et anglais (niveau requis pour l'accueil de la clientèle)",
      "Spécifique VTC",
      "5. Réglementation propre à l'activité VTC (réservation préalable, tarification, plateformes)",
      "6. Développement commercial et qualité de service",
      "7. Préparation aux épreuves d'admissibilité (QCM) et d'admission (pratique) de la CMA",
    ].join("\n"),
    modalitesEvaluation:
      "Évaluations formatives et examens blancs (QCM et mises en situation de conduite). Les épreuves " +
      "officielles (admissibilité et admission) sont organisées par la CMA. Attestation de fin de formation.",
    publicVise:
      "Toute personne souhaitant devenir chauffeur VTC et se présenter à l'examen T3P d'accès à la profession.",
    methodesPedagogiques:
      "Apports théoriques, examens blancs, mises en situation professionnelles et pratique de la conduite. " +
      "Formateurs spécialisés du secteur T3P.",
    piecesAttendues: [
      ...PIECES_TRANSPORT_BASE,
      "Permis B en cours de validité (plus de 3 ans)",
      "Casier judiciaire (bulletin n°2) compatible",
      "Attestation d'aptitude médicale (préfecture)",
      "Certificat PSC1 (premiers secours)",
    ],
    programmeAValider: true,
  },
  {
    cle: "taxi-initial",
    reference: "TAXI-INIT",
    titre: "Formation initiale Taxi — Préparation à l'examen T3P",
    alias: [
      "Taxi initial",
      "Formation initiale Taxi",
      "Préparation examen Taxi",
      "Formation Taxi",
      "Carte professionnelle taxi",
      "CCPCT",
    ],
    dureeHeures: 140,
    duree: "Durée indicative (à adapter au format et au niveau du candidat)",
    examen: false, // épreuve théorique nationale + épreuve pratique départementale organisées par la CMA
    soumisJury: false,
    certification:
      "Préparation à l'examen d'accès à la profession de conducteur de taxi (T3P), organisé par la Chambre " +
      "de Métiers et de l'Artisanat (CMA) : épreuve théorique d'admissibilité (tronc commun T3P + spécifique " +
      "taxi) puis épreuve pratique d'admission départementale. Le certificat de capacité professionnelle " +
      "(CCPCT) puis la carte professionnelle taxi sont délivrés après réussite.",
    objectifs:
      "Maîtriser la réglementation T3P et la réglementation spécifique taxi (tarification, taximètre, " +
      "stationnement), la sécurité routière, la connaissance du territoire départemental, la relation " +
      "client et la gestion de l'activité, afin de réussir les épreuves de l'examen T3P taxi.",
    prerequis:
      "Être titulaire du permis B en cours de validité depuis plus de 3 ans (2 ans en conduite " +
      "accompagnée), présenter un casier judiciaire (bulletin n°2) compatible avec la profession, une " +
      "attestation d'aptitude médicale (visite médicale en préfecture) et le certificat PSC1 (secours).",
    programme: [
      "Tronc commun T3P",
      "1. Réglementation du transport public particulier de personnes (T3P)",
      "2. Sécurité routière",
      "3. Gestion et développement de l'entreprise (statut, comptabilité, obligations)",
      "4. Français et anglais (niveau requis pour l'accueil de la clientèle)",
      "Spécifique taxi",
      "5. Réglementation propre à l'activité taxi : tarification, taximètre, stationnement, ADS",
      "6. Connaissance du territoire et de la réglementation locale (épreuve départementale)",
      "7. Préparation aux épreuves d'admissibilité (QCM) et d'admission pratique de la CMA",
    ].join("\n"),
    modalitesEvaluation:
      "Évaluations formatives et examens blancs (QCM et mises en situation). Les épreuves officielles " +
      "(théorique nationale et pratique départementale) sont organisées par la CMA. Attestation de fin de formation.",
    publicVise:
      "Toute personne souhaitant devenir conducteur de taxi et se présenter à l'examen T3P d'accès à la profession.",
    methodesPedagogiques:
      "Apports théoriques, examens blancs, mises en situation professionnelles et pratique de la conduite. " +
      "Formateurs spécialisés du secteur T3P.",
    piecesAttendues: [
      ...PIECES_TRANSPORT_BASE,
      "Permis B en cours de validité (plus de 3 ans)",
      "Casier judiciaire (bulletin n°2) compatible",
      "Attestation d'aptitude médicale (préfecture)",
      "Certificat PSC1 (premiers secours)",
    ],
    programmeAValider: true,
  },

  // ───────────────────────── Formations continues (renouvellement carte pro) ─────────────────────────
  {
    cle: "vtc-formation-continue",
    reference: "VTC-FC",
    titre: "Formation Continue VTC — Renouvellement de la carte professionnelle",
    alias: ["Formation continue VTC", "VTC formation continue", "FC VTC"],
    dureeHeures: 14,
    duree: "14 h (2 jours) en présentiel",
    examen: false,
    soumisJury: false,
    certification:
      "Formation continue obligatoire (arrêté du 11 août 2017 — Code des transports), à suivre tous " +
      "les 5 ans. Attestation officielle de suivi remise en fin de stage, indispensable au " +
      "renouvellement de la carte professionnelle auprès de la préfecture.",
    objectifs:
      "Mettre à jour les connaissances liées à la réglementation du transport public particulier de " +
      "personnes (T3P) et à la réglementation spécifique VTC ; renforcer la sécurité routière ; " +
      "améliorer la qualité de service et intégrer les évolutions du secteur (plateformes, ZFE).",
    prerequis:
      "Être titulaire d'une carte professionnelle VTC. À présenter le jour de la formation : pièce " +
      "d'identité en cours de validité et carte professionnelle VTC (ou justificatif d'activité).",
    programme: [
      "Module 1 — Réglementation du transport public particulier de personnes (4 h)",
      "Module 2 — Réglementation spécifique VTC (3 h)",
      "Module 3 — Sécurité routière (4 h)",
      "Module 4 — Développement professionnel et qualité de service (3 h)",
    ].join("\n"),
    modalitesEvaluation:
      "Évaluation des acquis tout au long de la formation (questionnaires, participation active, " +
      "émargement). Attestation officielle de suivi remise en fin de stage.",
    publicVise:
      "Conducteurs VTC titulaires d'une carte professionnelle en cours de validité ou expirant prochainement.",
    methodesPedagogiques:
      "Formation en présentiel (obligatoire par la réglementation), en groupe de 4 à 14 participants. " +
      "Supports numériques et papier, études de cas, mises en situation professionnelles.",
    piecesAttendues: [...PIECES_TRANSPORT_BASE, "Carte professionnelle VTC en cours de validité"],
  },
  {
    cle: "taxi-formation-continue",
    reference: "TAXI-FC",
    titre: "Formation Continue Taxi — Renouvellement de la carte professionnelle",
    alias: ["Formation continue Taxi", "Taxi formation continue", "FC Taxi"],
    dureeHeures: 14,
    duree: "14 h (2 jours) en présentiel",
    examen: false,
    soumisJury: false,
    certification:
      "Formation continue obligatoire (arrêté du 11 août 2017 — Code des transports), à suivre tous " +
      "les 5 ans. Attestation officielle de suivi remise en fin de stage, indispensable au " +
      "renouvellement de la carte professionnelle auprès de la préfecture.",
    objectifs:
      "Mettre à jour les connaissances liées à la réglementation T3P et à la réglementation spécifique " +
      "taxi (tarification, taximètre, stationnement) ; renforcer la sécurité routière ; améliorer la " +
      "qualité de service et intégrer les évolutions du secteur.",
    prerequis:
      "Être titulaire d'une carte professionnelle de conducteur de taxi. À présenter le jour de la " +
      "formation : pièce d'identité en cours de validité et carte professionnelle taxi.",
    programme: [
      "Module 1 — Réglementation du transport public particulier de personnes (4 h)",
      "Module 2 — Réglementation spécifique taxi : tarification, taximètre, obligations (3 h)",
      "Module 3 — Sécurité routière (4 h)",
      "Module 4 — Développement professionnel et qualité de service (3 h)",
    ].join("\n"),
    modalitesEvaluation:
      "Évaluation des acquis tout au long de la formation (questionnaires, participation active, " +
      "émargement). Attestation officielle de suivi remise en fin de stage.",
    publicVise:
      "Conducteurs de taxi titulaires d'une carte professionnelle en cours de validité ou expirant prochainement.",
    methodesPedagogiques:
      "Formation en présentiel (obligatoire par la réglementation), en groupe de 4 à 14 participants. " +
      "Supports numériques et papier, études de cas, mises en situation professionnelles.",
    piecesAttendues: [...PIECES_TRANSPORT_BASE, "Carte professionnelle taxi en cours de validité"],
  },

  // ───────────────────────── Passerelles VTC ↔ Taxi ─────────────────────────
  {
    cle: "passerelle-taxi-vtc",
    reference: "PASS-TAXI-VTC",
    titre: "Mobilité Taxi → VTC (passerelle)",
    alias: ["Passerelle Taxi VTC", "Passerelle taxi vers VTC", "Mobilité taxi VTC"],
    dureeHeures: 35,
    duree: "35 h (durée indicative, à adapter au format)",
    examen: false, // épreuve d'admission organisée par la CMA (pas d'examen interne OF)
    soumisJury: false,
    certification:
      "Préparation à l'épreuve d'admission VTC dans le cadre de la passerelle réservée aux conducteurs " +
      "de taxi (équivalences prévues par la réglementation T3P). L'épreuve officielle est organisée par la CMA.",
    objectifs:
      "Maîtriser les spécificités réglementaires de l'activité VTC, préparer l'épreuve d'admission " +
      "propre à la passerelle taxi → VTC et adapter sa pratique professionnelle au cadre du VTC.",
    prerequis:
      "Être titulaire de la carte professionnelle de conducteur de taxi en cours de validité et avoir " +
      "réussi l'examen théorique depuis moins de 3 ans (condition d'admission CMA).",
    programme: [
      "1. Cadre réglementaire comparé taxi / VTC",
      "2. Modalités de réservation et d'exercice en VTC",
      "3. Gestion et développement de l'activité VTC",
      "4. Relation client et qualité de service",
      "5. Préparation à l'épreuve d'admission spécifique",
    ].join("\n"),
    modalitesEvaluation:
      "Examens blancs et mises en situation. L'épreuve d'admission officielle est organisée par la CMA. " +
      "Attestation de fin de formation.",
    publicVise: "Conducteurs de taxi titulaires de la carte professionnelle souhaitant exercer en VTC.",
    methodesPedagogiques:
      "Apports théoriques, examens blancs et mises en situation. Formateurs spécialisés du secteur T3P.",
    piecesAttendues: [
      ...PIECES_TRANSPORT_BASE,
      "Carte professionnelle taxi en cours de validité",
      "Justificatif de réussite de l'examen théorique (moins de 3 ans)",
    ],
    programmeAValider: true,
  },
  {
    cle: "passerelle-vtc-taxi",
    reference: "PASS-VTC-TAXI",
    titre: "Mobilité VTC → Taxi (passerelle)",
    alias: ["Passerelle VTC Taxi", "Passerelle VTC vers taxi", "Mobilité VTC taxi"],
    dureeHeures: 35,
    duree: "35 h (durée indicative, à adapter au format)",
    examen: false, // épreuves d'admission organisées par la CMA (pas d'examen interne OF)
    soumisJury: false,
    certification:
      "Préparation aux épreuves d'admission taxi dans le cadre de la passerelle réservée aux conducteurs " +
      "VTC (équivalences prévues par la réglementation T3P). Les épreuves officielles sont organisées par la CMA.",
    objectifs:
      "Maîtriser les spécificités réglementaires de l'activité de taxi (tarification réglementée, " +
      "connaissance du territoire), préparer les épreuves propres à la passerelle VTC → taxi.",
    prerequis:
      "Être titulaire de la carte professionnelle de conducteur VTC en cours de validité et avoir " +
      "réussi l'examen théorique depuis moins de 3 ans (condition d'admission CMA).",
    programme: [
      "1. Cadre réglementaire comparé VTC / taxi",
      "2. Tarification, taximètre et facturation",
      "3. Connaissance du territoire départemental",
      "4. Gestion et cadre juridique de l'activité taxi",
      "5. Préparation aux épreuves d'admission spécifiques",
    ].join("\n"),
    modalitesEvaluation:
      "Examens blancs et mises en situation. Les épreuves d'admission officielles sont organisées par " +
      "la CMA. Attestation de fin de formation.",
    publicVise: "Chauffeurs VTC titulaires de la carte professionnelle souhaitant exercer en taxi.",
    methodesPedagogiques:
      "Apports théoriques, examens blancs et mises en situation. Formateurs spécialisés du secteur T3P.",
    piecesAttendues: [
      ...PIECES_TRANSPORT_BASE,
      "Carte professionnelle VTC en cours de validité",
      "Justificatif de réussite de l'examen théorique (moins de 3 ans)",
    ],
    programmeAValider: true,
  },

  // ───────────────────────── TPMR ─────────────────────────
  {
    cle: "tpmr",
    reference: "TPMR",
    titre: "TPMR — Transport de Personnes à Mobilité Réduite",
    alias: ["TPMR", "Transport de personnes à mobilité réduite", "Conducteur accompagnateur TPMR"],
    dureeHeures: 14,
    duree: "14 h (2 jours) en présentiel — à adapter (1 à 3 jours)",
    examen: false,
    soumisJury: false,
    certification:
      "Attestation de formation au transport de personnes à mobilité réduite (TPMR) — formation " +
      "qualifiante, non certifiante, conforme aux bonnes pratiques du transport sanitaire et de personnes.",
    objectifs:
      "Accueillir et accompagner les personnes à mobilité réduite en sécurité : techniques de " +
      "manutention et de transfert, installation et arrimage du fauteuil, posture professionnelle adaptée.",
    prerequis: "Être titulaire du permis B en cours de validité. Aucune connaissance préalable requise.",
    programme: [
      "1. Connaissance des publics (handicap, perte d'autonomie, personnes âgées)",
      "2. Cadre réglementaire du transport de PMR",
      "3. Communication et posture professionnelle adaptée",
      "4. Techniques de manutention et de transfert",
      "5. Installation, arrimage et sécurité du fauteuil à bord",
      "6. Mises en situation pratiques sur véhicule adapté",
    ].join("\n"),
    modalitesEvaluation:
      "Évaluation des acquis par mises en situation pratiques. Délivrance d'une attestation de fin de formation.",
    publicVise:
      "Conducteurs et accompagnateurs assurant le transport de personnes à mobilité réduite " +
      "(taxi, VTC, transport sanitaire, services dédiés).",
    methodesPedagogiques:
      "Formation en présentiel uniquement, avec mises en situation pratiques sur véhicule adapté et " +
      "matériel d'arrimage.",
    piecesAttendues: PIECES_TRANSPORT_BASE,
  },
];
