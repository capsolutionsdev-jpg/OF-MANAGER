// =============================================================
//  Catalogue de RÉFÉRENCE des formations sécurité (SSIAP, SST, APS).
//
//  Ces contenus sont réglementaires (arrêté du 2 mai 2005 modifié pour le
//  SSIAP, référentiel INRS pour le SST) : ils sont donc IDENTIQUES pour tous
//  les organismes de formation. Ce catalogue sert de bibliothèque commune à
//  TOUT OFManager : n'importe quel OF peut importer ces modèles dans son
//  propre catalogue (voir lib/actions/catalogue-actions.ts).
//
//  L'import ne REMPLACE jamais une donnée déjà saisie par l'organisme : il ne
//  fait que compléter les champs vides (et créer la formation si absente).
// =============================================================

export type ModeleFormation = {
  /** Clé stable du modèle (sert au rapprochement et à l'idempotence). */
  cle: string;
  /** Référence proposée si la formation doit être créée. */
  reference: string;
  titre: string;
  /** Libellés alternatifs rencontrés dans les catalogues existants (rapprochement). */
  alias: string[];
  dureeHeures: number;
  duree: string;
  objectifs: string;
  prerequis: string;
  programme: string;
  publicVise: string;
  methodesPedagogiques: string;
  modalitesEvaluation: string;
  certification: string;
  piecesAttendues: string[];
  /** Sanctionnée par un examen (→ convocation d'examen). */
  examen: boolean;
  /** Examen devant un jury (→ module jury / défraiement). */
  soumisJury: boolean;
  /** Grille de certification officielle INRS à pré-remplir ("SST" | "MAC_SST"). */
  grilleInrs?: "SST" | "MAC_SST";
  /** true = contenu pédagogique détaillé à compléter/valider par l'organisme. */
  programmeAValider?: boolean;
};

const METHODES_SSIAP =
  "Fascicule pédagogique remis à l'ouverture du stage. Exercices de mise en pratique " +
  "(manipulation des extincteurs, RIA…). QCM informatiques avec télécommande pour évaluer " +
  "régulièrement les connaissances théoriques. Projection de vidéos sur l'incendie et les " +
  "particularités des ERP et IGH.";

const METHODES_INRS =
  "Formation en présentiel, en INTRA-entreprise (dans vos locaux) ou en EXTRA-entreprise " +
  "(sessions inter-entreprises dans nos locaux). Pédagogie active avec mises en situation " +
  "et cas pratiques.";

const PIECES_BASE = [
  "CNI / Passeport / Carte de séjour",
  "Justificatif de domicile",
  "1 photo d'identité",
];
const PIECES_SSIAP = [
  ...PIECES_BASE,
  "Attestation de secourisme en cours de validité (PSC1 / SST / PSE1)",
  "Certificat d'aptitude médicale",
];
const PIECES_SSIAP_DIPLOME = [...PIECES_SSIAP, "Copie du diplôme SSIAP (recto-verso)"];
const PIECES_APS = [
  ...PIECES_BASE,
  "Casier judiciaire (du pays d'origine pour les étrangers)",
  "Attestation de niveau de langue B1 minimum ou diplôme équivalent (étrangers)",
];

const REF_ARRETE =
  "arrêté du 2 mai 2005 modifié, relatif aux missions, à l'emploi et à la qualification du " +
  "personnel permanent des services de sécurité incendie des établissements recevant du public " +
  "et des immeubles de grande hauteur";

/** Public visé commun aux formations SSIAP d'un niveau donné. */
const publicSsiap = (n: 1 | 2 | 3) =>
  n === 1
    ? "Toute personne souhaitant exercer la fonction d'agent des services de sécurité incendie et d'assistance à personnes (SSIAP 1)."
    : n === 2
      ? "Agent de sécurité incendie souhaitant exercer la fonction de chef d'équipe (SSIAP 2)."
      : "Personne souhaitant exercer la fonction de chef de service de sécurité incendie (SSIAP 3).";

export const CATALOGUE_SECURITE: ModeleFormation[] = [
  // ───────────────────────── SSIAP 1 ─────────────────────────
  {
    cle: "ssiap1-initial",
    reference: "SSIAP1",
    titre: "SSIAP 1 — Agent de service de sécurité incendie et d'assistance à personnes",
    alias: ["SSIAP 1 initial", "SSIAP1 initial", "SSIAP 1"],
    dureeHeures: 67,
    duree: "67 h minimum (hors examen) — 12 personnes maximum",
    examen: true,
    soumisJury: true,
    certification: `SSIAP 1 (${REF_ARRETE})`,
    objectifs:
      "Rendre le stagiaire capable d'assurer la fonction d'agent de sécurité incendie dans un ERP, " +
      "un IGH ou un bâtiment relevant du code du travail ne répondant pas aux dispenses figurant à " +
      "l'article 4 de l'arrêté du 2 mai 2005 modifié.",
    prerequis:
      "Soit AFPS ou PSC1 acquis depuis moins de deux ans, soit CFAPSE, PSE1 ou SST en cours de " +
      "validité. Évaluation de la capacité à retranscrire des anomalies sur une main courante. Aptitude médicale.",
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
    modalitesEvaluation:
      "Évaluation orale quotidienne par les formateurs et évaluation écrite en fin de formation. " +
      "Examen : QCM de 40 questions et ronde incendie avec résolution d'un incident, devant jury.",
    publicVise: publicSsiap(1),
    methodesPedagogiques: METHODES_SSIAP,
    piecesAttendues: PIECES_SSIAP,
  },
  {
    cle: "ssiap1-recyclage",
    reference: "SSIAP1-REC",
    titre: "SSIAP 1 — Recyclage",
    alias: ["SSIAP 1 recyclage", "SSIAP1 recyclage"],
    dureeHeures: 14,
    duree: "14 h — 15 personnes maximum",
    examen: false,
    soumisJury: false,
    certification: `SSIAP 1 — recyclage (${REF_ARRETE})`,
    objectifs: "Permettre au stagiaire de conserver sa qualification SSIAP 1.",
    prerequis:
      "Être titulaire du diplôme SSIAP 1 ou des diplômes ERP et IGH niveau 1. " +
      "Qualification de secourisme en cours de validité.",
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
    modalitesEvaluation:
      "Mises en situation d'intervention. Délivrance d'une attestation de recyclage SSIAP 1.",
    publicVise: publicSsiap(1),
    methodesPedagogiques: METHODES_SSIAP,
    piecesAttendues: PIECES_SSIAP_DIPLOME,
  },
  {
    cle: "ssiap1-ran",
    reference: "SSIAP1-RAN",
    titre: "SSIAP 1 — Remise à niveau",
    alias: ["SSIAP 1 remise à niveau", "SSIAP1 remise a niveau"],
    dureeHeures: 21,
    duree: "21 h — 15 personnes maximum",
    examen: false,
    soumisJury: false,
    certification: `SSIAP 1 — remise à niveau (${REF_ARRETE})`,
    objectifs: "Permettre au stagiaire de conserver sa qualification SSIAP 1.",
    prerequis:
      "Être titulaire du diplôme SSIAP 1 ou des diplômes ERP1 et IGH1 niveau 1. " +
      "Qualification de secourisme en cours de validité. Certificat médical de moins de trois mois " +
      "pour le personnel n'exerçant pas une fonction dans un service de sécurité incendie.",
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
      "5. Exploitation du PC de sécurité (2 h)",
      "   • Fonctionnement d'un poste de sécurité. Appel, accueil et guidage des secours publics.",
      "",
      "6. Rondes de sécurité et surveillance des travaux (2 h)",
      "   • Conduite d'une ronde de sécurité.",
    ].join("\n"),
    modalitesEvaluation:
      "Mises en situation d'intervention. Délivrance d'une attestation de remise à niveau SSIAP 1.",
    publicVise: publicSsiap(1),
    methodesPedagogiques: METHODES_SSIAP,
    piecesAttendues: PIECES_SSIAP_DIPLOME,
  },

  // ───────────────────────── SSIAP 2 / 3 ─────────────────────────
  // Durées et cadre réglementaires ; le déroulé détaillé reste à valider par
  // l'organisme (programmeAValider) — il varie selon le centre de formation.
  {
    cle: "ssiap2-initial",
    reference: "SSIAP2",
    titre: "SSIAP 2 — Chef d'équipe de service de sécurité incendie",
    alias: ["SSIAP 2 initial", "SSIAP2 initial", "SSIAP 2"],
    dureeHeures: 70,
    duree: "70 h (hors examen)",
    examen: true,
    soumisJury: true,
    certification: `SSIAP 2 (${REF_ARRETE})`,
    objectifs:
      "Rendre le stagiaire capable d'encadrer une équipe de sécurité incendie : management de l'équipe, " +
      "tenue du poste central de sécurité et gestion d'une situation de crise.",
    prerequis:
      "Être titulaire du diplôme SSIAP 1 (ou équivalent) et justifier de l'expérience requise par la " +
      "réglementation. Qualification de secourisme en cours de validité. Aptitude médicale.",
    programme: [
      "1. Rôles et missions du chef d'équipe",
      "2. Manipulation des systèmes de sécurité incendie",
      "3. Hygiène et sécurité en matière de sécurité incendie",
      "4. Chef du poste central de sécurité en situation de crise",
      "5. Management de l'équipe de sécurité",
      "",
      "(Déroulé horaire détaillé à compléter par l'organisme selon son référentiel interne.)",
    ].join("\n"),
    modalitesEvaluation:
      "Évaluations en cours de formation. Examen final devant jury (QCM et épreuve pratique d'animation).",
    publicVise: publicSsiap(2),
    methodesPedagogiques: METHODES_SSIAP,
    piecesAttendues: PIECES_SSIAP_DIPLOME,
    programmeAValider: true,
  },
  {
    cle: "ssiap3-initial",
    reference: "SSIAP3",
    titre: "SSIAP 3 — Chef de service de sécurité incendie",
    alias: ["SSIAP 3 initial", "SSIAP3 initial", "SSIAP 3"],
    dureeHeures: 216,
    duree: "216 h (hors examen)",
    examen: true,
    soumisJury: true,
    certification: `SSIAP 3 (${REF_ARRETE})`,
    objectifs:
      "Rendre le stagiaire capable de manager un service de sécurité incendie : conseil au chef " +
      "d'établissement, suivi des obligations de contrôle, management du service et budget.",
    prerequis:
      "Être titulaire du diplôme SSIAP 2 (ou équivalent) avec l'expérience requise, ou d'un diplôme " +
      "de niveau 4 minimum. Qualification de secourisme en cours de validité. Aptitude médicale.",
    programme: [
      "1. Le feu et ses conséquences",
      "2. La sécurité incendie et les bâtiments",
      "3. La réglementation incendie (ERP, IGH, code du travail)",
      "4. La gestion du personnel et des équipements du service de sécurité",
      "5. Le budget du service de sécurité",
      "6. Le conseil au chef d'établissement et la commission de sécurité",
      "",
      "(Déroulé horaire détaillé à compléter par l'organisme selon son référentiel interne.)",
    ].join("\n"),
    modalitesEvaluation:
      "Évaluations en cours de formation. Examen final devant jury (QCM et épreuve orale).",
    publicVise: publicSsiap(3),
    methodesPedagogiques: METHODES_SSIAP,
    piecesAttendues: PIECES_SSIAP_DIPLOME,
    programmeAValider: true,
  },

  // Recyclages / remises à niveau SSIAP 2 et 3 : mêmes finalités qu'au niveau 1
  // (maintien de la qualification), avec les durées propres à chaque niveau.
  ...([
    { n: 2 as const, type: "recyclage" as const, h: 14, ref: "SSIAP2-REC" },
    { n: 2 as const, type: "ran" as const, h: 21, ref: "SSIAP2-RAN" },
    { n: 3 as const, type: "recyclage" as const, h: 21, ref: "SSIAP3-REC" },
    { n: 3 as const, type: "ran" as const, h: 35, ref: "SSIAP3-RAN" },
  ].map(({ n, type, h, ref }): ModeleFormation => {
    const libelle = type === "recyclage" ? "Recyclage" : "Remise à niveau";
    const libelleMin = type === "recyclage" ? "recyclage" : "remise à niveau";
    return {
      cle: `ssiap${n}-${type}`,
      reference: ref,
      titre: `SSIAP ${n} — ${libelle}`,
      alias: [`SSIAP ${n} ${libelleMin}`, `SSIAP${n} ${libelleMin}`],
      dureeHeures: h,
      duree: `${h} h`,
      examen: false,
      soumisJury: false,
      certification: `SSIAP ${n} — ${libelleMin} (${REF_ARRETE})`,
      objectifs: `Permettre au stagiaire de conserver sa qualification SSIAP ${n}.`,
      prerequis:
        `Être titulaire du diplôme SSIAP ${n} (ou équivalent reconnu). Qualification de secourisme ` +
        `en cours de validité.` +
        (type === "ran"
          ? " Certificat médical de moins de trois mois pour le personnel n'exerçant pas une fonction dans un service de sécurité incendie."
          : ""),
      programme: [
        "1. Prévention — évolution de la réglementation",
        "2. Moyens de secours — évolution de la réglementation",
        "3. Mises en situation d'intervention",
        ...(type === "ran"
          ? ["4. Exploitation du PC de sécurité", "5. Rondes de sécurité et surveillance des travaux"]
          : []),
        "",
        "(Déroulé horaire détaillé à compléter par l'organisme selon son référentiel interne.)",
      ].join("\n"),
      modalitesEvaluation: `Mises en situation d'intervention. Délivrance d'une attestation de ${libelleMin} SSIAP ${n}.`,
      publicVise: publicSsiap(n),
      methodesPedagogiques: METHODES_SSIAP,
      piecesAttendues: PIECES_SSIAP_DIPLOME,
      programmeAValider: true,
    };
  })),

  // ───────────────────────── SST / MAC SST (INRS) ─────────────────────────
  {
    cle: "sst",
    reference: "SST",
    titre: "Sauveteur Secouriste du Travail (SST)",
    alias: ["SST", "SST initial", "Sauveteur secouriste du travail"],
    dureeHeures: 14,
    duree: "14 h (2 jours)",
    examen: false,
    soumisJury: false,
    grilleInrs: "SST",
    certification:
      "Certificat SST délivré sous l'égide de l'INRS et de l'Assurance Maladie – Risques professionnels (validité 24 mois).",
    objectifs:
      "Maîtriser la conduite à tenir et les gestes de premiers secours\n" +
      "Intervenir efficacement face à une situation d'accident du travail\n" +
      "Contribuer à la prévention des risques professionnels dans l'entreprise",
    prerequis: "Aucun prérequis.",
    programme: [
      "Le sauvetage secourisme du travail et la prévention",
      "Protéger, de protéger à prévenir",
      "Examiner et faire alerter",
      "Secourir : saignements, étouffement, malaise, brûlures, traumatismes",
      "Réanimation cardio-pulmonaire et défibrillation (DAE)",
      "Situations inhérentes aux risques spécifiques de l'entreprise",
    ].join("\n"),
    modalitesEvaluation:
      "Évaluation continue lors de mises en situation, conformément au référentiel INRS. " +
      "Délivrance du certificat SST en cas de réussite.",
    publicVise: "Tout salarié désigné par l'employeur pour devenir Sauveteur Secouriste du Travail.",
    methodesPedagogiques: METHODES_INRS,
    piecesAttendues: PIECES_BASE,
  },
  {
    cle: "mac-sst",
    reference: "MAC-SST",
    titre: "Maintien et Actualisation des Compétences SST (MAC SST)",
    alias: ["MAC SST", "MAC-SST", "Recyclage SST"],
    dureeHeures: 7,
    duree: "7 h (1 jour)",
    examen: false,
    soumisJury: false,
    grilleInrs: "MAC_SST",
    certification:
      "Renouvellement du certificat SST (INRS / Assurance Maladie) pour une nouvelle période de 24 mois.",
    objectifs:
      "Actualiser ses compétences de Sauveteur Secouriste du Travail\n" +
      "Réviser les gestes d'urgence et la conduite à tenir\n" +
      "Maintenir sa capacité à intervenir et à prévenir les risques",
    prerequis: "Être titulaire du certificat SST (en cours ou récemment expiré).",
    programme: [
      "Retour d'expérience sur des interventions",
      "Révision des gestes de premiers secours",
      "Actualisation des recommandations et techniques",
      "Mises en situation d'accident du travail",
      "Risques spécifiques de l'entreprise",
    ].join("\n"),
    modalitesEvaluation:
      "Évaluation continue selon le référentiel INRS. Renouvellement du certificat SST en cas de réussite.",
    publicVise: "Tout titulaire d'un certificat SST devant renouveler ses compétences avant échéance.",
    methodesPedagogiques: METHODES_INRS,
    piecesAttendues: PIECES_BASE,
  },

  // ───────────────────────── Sécurité privée (CNAPS) ─────────────────────────
  {
    cle: "tfp-aps",
    reference: "TFP-APS",
    titre: "TFP APS — Agent de prévention et de sécurité",
    alias: ["TFP APS", "TFP-APS", "APS"],
    dureeHeures: 175,
    duree: "175 h (hors examen)",
    examen: true,
    soumisJury: true,
    certification: "Titre à finalité professionnelle APS (RNCP).",
    objectifs:
      "Préparer le stagiaire à exercer le métier d'agent de prévention et de sécurité : " +
      "surveillance, filtrage et contrôle d'accès, prévention des risques, secours aux personnes " +
      "et intervention dans le cadre légal.",
    prerequis:
      "Autorisation préalable d'entrée en formation délivrée par le CNAPS. Savoir lire, écrire et " +
      "s'exprimer en français (niveau B1 pour les personnes étrangères).",
    programme: [
      "Module socle : secourisme, environnement juridique, gestion des conflits, transmission des consignes",
      "Module spécifique : prévention des risques d'incendie, filtrage et contrôle d'accès, surveillance et gardiennage",
      "Module professionnel : événementiel, sûreté (malveillance, terrorisme), palpation et inspection des bagages",
      "",
      "(Déroulé horaire détaillé à compléter par l'organisme selon le référentiel de certification.)",
    ].join("\n"),
    modalitesEvaluation:
      "Évaluations par unité de compétences (QCM, mises en situation professionnelle) devant jury.",
    publicVise: "Toute personne souhaitant exercer une activité de sécurité privée (carte professionnelle CNAPS).",
    methodesPedagogiques: METHODES_INRS,
    piecesAttendues: [...PIECES_APS, "Autorisation préalable CNAPS"],
    programmeAValider: true,
  },
  {
    cle: "mac-aps",
    reference: "MAC-APS",
    titre: "MAC APS — Maintien et actualisation des compétences APS",
    alias: ["MAC APS", "MAC-APS"],
    dureeHeures: 31,
    duree: "31 h",
    examen: false,
    soumisJury: false,
    certification: "Attestation MAC APS (maintien des compétences pour le renouvellement de la carte professionnelle).",
    objectifs:
      "Maintenir et actualiser les compétences de l'agent de prévention et de sécurité en vue du " +
      "renouvellement de sa carte professionnelle.",
    prerequis:
      "Être titulaire d'une carte professionnelle en cours de validité OU d'une autorisation préalable du CNAPS.",
    programme: [
      "Secourisme (SST ou équivalent)",
      "Gestion des situations conflictuelles",
      "Cadre légal de l'usage de la force et déontologie",
      "Prévention des risques d'incendie",
      "Sûreté : prévention des actes de malveillance et du risque terroriste",
      "",
      "(Déroulé horaire détaillé à compléter par l'organisme selon le référentiel en vigueur.)",
    ].join("\n"),
    modalitesEvaluation: "Évaluation continue et mises en situation. Attestation de fin de formation.",
    publicVise: "Agent de sécurité privée devant renouveler sa carte professionnelle.",
    methodesPedagogiques: METHODES_INRS,
    piecesAttendues: [...PIECES_APS, "Carte professionnelle valide OU autorisation préalable CNAPS"],
    programmeAValider: true,
  },

  // ───────────────────────── Dirigeant d'entreprise de sécurité privée ─────────────────────────
  {
    cle: "dirigeant-securite-privee-initiale",
    reference: "dirigeant-societe-securite-privee-initiale",
    titre: "Dirigeant d'entreprise de sécurité privée (formation initiale)",
    alias: [
      "Dirigeant sécurité privée",
      "Dirigeant d'entreprise de sécurité",
      "Dirigeant CNAPS",
      "Aptitude dirigeant CNAPS",
    ],
    dureeHeures: 268,
    duree: "268 h (hors examen)",
    examen: true,
    soumisJury: true,
    certification:
      "Titre « Dirigeant d'entreprise de sécurité privée » — RNCP 40385 (niveau 5). " +
      "Atteste de l'aptitude professionnelle exigée pour l'agrément dirigeant CNAPS.",
    objectifs:
      "Acquérir l'aptitude professionnelle exigée pour diriger une entreprise de sécurité privée et obtenir " +
      "l'agrément dirigeant auprès du CNAPS. Maîtriser le cadre juridique, la gestion administrative et " +
      "financière et le développement d'une société de sécurité.",
    prerequis:
      "Être majeur ; être de nationalité française ou ressortissant de l'UE/EEE ; maîtriser le français " +
      "(oral et écrit) ; justifier d'un niveau BAC minimum, ou d'un diplôme SSIAP 3, ou d'une expérience " +
      "à un poste à responsabilité ; casier judiciaire compatible avec l'exercice de la profession.",
    programme: [
      "1. Cadre juridique et réglementaire des activités privées de sécurité (Livre VI du CSI) — 80 h",
      "2. Connaissances stratégiques (stratégie d'entreprise, piloter le développement) — 40 h",
      "3. Connaissances pratiques (déontologie, management, relation client) — 20 h",
      "4. Gestion administrative, sociale et financière d'une société de sécurité — 60 h",
      "5. Développement et stratégie d'entreprise — 24 h",
      "",
      "(Contenu adapté au projet du candidat. Programme détaillé à valider par l'organisme.)",
    ].join("\n"),
    modalitesEvaluation:
      "Certification par validation de 5 activités (A1 à A5) : épreuves écrites et études de cas " +
      "évaluées par un jury. La validation de l'ensemble des activités est requise pour obtenir le titre " +
      "et l'aptitude à l'agrément dirigeant CNAPS.",
    publicVise:
      "Créateurs et repreneurs d'entreprise de sécurité privée, futurs gérants et dirigeants souhaitant " +
      "obtenir leur agrément dirigeant auprès du CNAPS.",
    methodesPedagogiques:
      "Apports juridiques, managériaux et financiers. Études de cas concrètes tirées de la gestion " +
      "d'une société de sécurité. Support pédagogique numérique remis aux stagiaires. Formateurs experts " +
      "du cadre réglementaire CNAPS et de la gestion d'entreprise.",
    piecesAttendues: [
      ...PIECES_BASE,
      "Casier judiciaire (extrait bulletin n°3)",
      "Preuve de nationalité (français ou UE/EEE)",
      "Diplôme ou certificat de niveau BAC minimum OU diplôme SSIAP 3 OU justificatif d'expérience professionnelle",
    ],
    programmeAValider: true,
  },
];

/** Normalise un intitulé pour le rapprochement (accents, casse, ponctuation). */
export function normaliserTitre(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Retrouve le modèle du catalogue correspondant à un intitulé existant. */
export function trouverModele(titre: string): ModeleFormation | undefined {
  const n = normaliserTitre(titre);
  return CATALOGUE_SECURITE.find(
    (m) =>
      normaliserTitre(m.titre) === n ||
      m.alias.some((a) => normaliserTitre(a) === n),
  );
}
