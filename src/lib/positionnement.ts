// =============================================================
//  Test de positionnement — banque de questions par famille de
//  formation. Envoyé par lien le 1er jour de session (cron matin).
//  ~10 questions mêlant QCU (choix unique), QCM (choix multiples)
//  et COURTE (réponse libre), adaptées à l'intitulé de la formation.
//  Une formation peut surcharger ses questions via
//  Formation.positionnementQuestions (JSON, même structure).
// =============================================================

export type PositionnementQuestion = {
  id: string;
  type: "QCU" | "QCM" | "COURTE";
  question: string;
  options?: string[];
};

const OUI_NON = ["Oui", "Non"];

// Questions communes d'entrée (expérience / attentes) ajoutées à chaque test.
const COMMUNES: PositionnementQuestion[] = [
  {
    id: "exp",
    type: "QCU",
    question: "Avez-vous déjà suivi une formation dans ce domaine ?",
    options: OUI_NON,
  },
  {
    id: "pratique",
    type: "QCU",
    question: "Exercez-vous (ou avez-vous exercé) une activité en lien avec cette formation ?",
    options: ["Oui, actuellement", "Oui, par le passé", "Non"],
  },
  {
    id: "attentes",
    type: "COURTE",
    question: "Qu'attendez-vous en priorité de cette formation ?",
  },
];

const BANQUES: { motsCles: RegExp; questions: PositionnementQuestion[] }[] = [
  {
    // Secourisme — SST / MAC SST / PSC1
    motsCles: /sst|secouris|psc1|sauveteur|défibrillateur|defibrillateur|gestes qui sauvent/i,
    questions: [
      { id: "q1", type: "QCU", question: "D'après la loi, êtes-vous obligé de porter assistance à une personne en danger ?", options: OUI_NON },
      { id: "q2", type: "COURTE", question: "Citez les 3 numéros d'urgence en cas d'assistance à personne en France." },
      { id: "q3", type: "QCU", question: "Devez-vous utiliser un défibrillateur automatisé externe (DAE) en cas d'arrêt cardiaque si vous en avez un à disposition ?", options: OUI_NON },
      { id: "q4", type: "QCU", question: "À qui est destiné le numéro d'urgence 114 ?", options: ["Aux personnes sourdes ou malentendantes", "Aux médecins de garde", "Aux pompiers uniquement"] },
      { id: "q5", type: "QCM", question: "Parmi ces actions, lesquelles font partie du rôle du SST ? (plusieurs réponses)", options: ["Protéger", "Examiner", "Faire alerter / alerter", "Secourir", "Prescrire des médicaments"] },
      { id: "q6", type: "QCU", question: "Êtes-vous sensible à la vue du sang ou au fait d'en entendre parler ?", options: OUI_NON },
      { id: "q7", type: "QCU", question: "Une victime inconsciente qui respire doit être :", options: ["Mise sur le dos", "Mise en position latérale de sécurité (PLS)", "Assise"] },
    ],
  },
  {
    // Incendie — EPI / SSIAP / évacuation
    motsCles: /incendie|epi|ssiap|évacuation|evacuation|extincteur/i,
    questions: [
      { id: "q1", type: "QCU", question: "Que signifie le triangle du feu ?", options: ["Combustible + comburant + énergie d'activation", "Flamme + fumée + chaleur", "Eau + CO2 + poudre"] },
      { id: "q2", type: "QCM", question: "Quels extincteurs peut-on utiliser sur un feu d'origine électrique ? (plusieurs réponses)", options: ["Eau en jet plein", "CO2", "Poudre", "Eau pulvérisée avec additif"] },
      { id: "q3", type: "QCU", question: "Faut-il utiliser l'ascenseur lors d'une évacuation incendie ?", options: OUI_NON },
      { id: "q4", type: "COURTE", question: "Quel est le numéro d'appel des sapeurs-pompiers ?" },
      { id: "q5", type: "QCU", question: "Le point de rassemblement sert à :", options: ["Compter les personnes évacuées", "Stocker le matériel", "Attendre la fin de l'alarme à l'intérieur"] },
      { id: "q6", type: "QCU", question: "Avez-vous déjà manipulé un extincteur ?", options: OUI_NON },
      { id: "q7", type: "QCU", question: "Un feu naissant de friteuse s'éteint avec :", options: ["De l'eau", "Un couvercle / couverture anti-feu", "Un ventilateur"] },
    ],
  },
  {
    // Sécurité privée — APS / TFP / CQP / cynophile
    motsCles: /aps|tfp|cqp|sécurité privée|securite privee|agent de s|cynophile|surveillance/i,
    questions: [
      { id: "q1", type: "QCU", question: "Un agent de sécurité privée peut-il procéder à une palpation de sécurité sans condition ?", options: ["Oui, librement", "Non, uniquement dans un cadre précis (consentement, habilitation…)", "Oui, si la personne paraît suspecte"] },
      { id: "q2", type: "QCU", question: "Le CNAPS est :", options: ["Le conseil national des activités privées de sécurité", "Un syndicat d'agents", "Une société de gardiennage"] },
      { id: "q3", type: "QCM", question: "Quelles sont les missions possibles d'un agent de prévention et de sécurité ? (plusieurs réponses)", options: ["Filtrage / contrôle d'accès", "Rondes de surveillance", "Interpellation musclée systématique", "Alerte et guidage des secours"] },
      { id: "q4", type: "QCU", question: "La légitime défense doit être :", options: ["Proportionnée et simultanée à l'agression", "Toujours armée", "Décidée après l'agression"] },
      { id: "q5", type: "COURTE", question: "Quel document personnel est obligatoire pour exercer en sécurité privée ?" },
      { id: "q6", type: "QCU", question: "Avez-vous déjà travaillé dans la sécurité (privée ou publique) ?", options: OUI_NON },
      { id: "q7", type: "QCU", question: "Un agent privé a-t-il les mêmes pouvoirs qu'un policier ?", options: OUI_NON },
    ],
  },
  {
    // Transport — FIMO / FCO / marchandises / voyageurs / exploitant
    motsCles: /fimo|fco|transport|marchandise|voyageur|routier|exploitant|capacit|taxi|vtc|tpmr|t3p/i,
    questions: [
      { id: "q1", type: "QCU", question: "Le chronotachygraphe sert à :", options: ["Enregistrer les temps de conduite et de repos", "Mesurer la consommation", "Suivre la position GPS du véhicule"] },
      { id: "q2", type: "QCU", question: "La durée maximale de conduite continue est de :", options: ["3 h 30", "4 h 30", "5 h 30"] },
      { id: "q3", type: "QCM", question: "Quels documents doivent se trouver à bord d'un véhicule de transport de marchandises ? (plusieurs réponses)", options: ["Permis de conduire", "Carte de qualification conducteur", "Lettre de voiture", "Bail commercial"] },
      { id: "q4", type: "COURTE", question: "Qu'est-ce que la licence de transport intérieur et qui la délivre ?" },
      { id: "q5", type: "QCU", question: "L'arrimage du chargement relève de la responsabilité :", options: ["Du conducteur uniquement", "Du conducteur et de l'entreprise", "Du client uniquement"] },
      { id: "q6", type: "QCU", question: "Avez-vous une expérience de conduite professionnelle ?", options: OUI_NON },
      { id: "q7", type: "QCU", question: "Le surpoids d'un véhicule est :", options: ["Toléré jusqu'à 10 %", "Une infraction", "Autorisé sur autoroute"] },
    ],
  },
  {
    // Langues — FLE / français / TEF / TCF / anglais
    motsCles: /français|francais|fle|tef|tcf|delf|dalf|anglais|toeic|toefl|ielts|langue|linguistique|alphab|civique|naturalisation|dilf/i,
    questions: [
      { id: "q1", type: "QCU", question: "Complétez : « Hier, je ____ au marché. »", options: ["vais", "suis allé(e)", "irai"] },
      { id: "q2", type: "QCU", question: "Quel mot est correctement orthographié ?", options: ["acceuil", "accueil", "acueil"] },
      { id: "q3", type: "COURTE", question: "Présentez-vous en 2 ou 3 phrases (nom, situation, objectif)." },
      { id: "q4", type: "QCU", question: "« Ils ____ contents » :", options: ["sont", "ont", "son"] },
      { id: "q5", type: "QCU", question: "Comprenez-vous une conversation courante en français ?", options: ["Facilement", "Avec quelques difficultés", "Difficilement"] },
      { id: "q6", type: "QCU", question: "Écrivez-vous des e-mails ou courriers en français dans votre quotidien ?", options: ["Souvent", "Parfois", "Jamais"] },
      { id: "q7", type: "COURTE", question: "Pourquoi souhaitez-vous améliorer votre niveau de français ?" },
    ],
  },
  {
    // Digital — webmarketing / SEO / community / IA / bureautique
    motsCles: /webmarketing|seo|référencement|referencement|community|digital|intelligence artificielle|\bia\b|bureautique|informatique/i,
    questions: [
      { id: "q1", type: "QCU", question: "À quoi sert le référencement naturel (SEO) ?", options: ["À payer des publicités", "À améliorer la visibilité d'un site dans les résultats de recherche", "À créer des logos"] },
      { id: "q2", type: "QCM", question: "Quels réseaux sociaux avez-vous déjà utilisés à titre professionnel ? (plusieurs réponses)", options: ["LinkedIn", "Instagram", "TikTok", "Facebook", "Aucun"] },
      { id: "q3", type: "QCU", question: "Un mot-clé en SEO est :", options: ["Le mot de passe du site", "La requête tapée par l'internaute", "Le nom de domaine"] },
      { id: "q4", type: "QCU", question: "Avez-vous déjà utilisé un outil d'intelligence artificielle (ChatGPT, etc.) ?", options: ["Régulièrement", "Quelques fois", "Jamais"] },
      { id: "q5", type: "COURTE", question: "Décrivez en une phrase un projet digital que vous aimeriez mener." },
      { id: "q6", type: "QCU", question: "Comment évaluez-vous votre aisance avec les outils numériques ?", options: ["Très à l'aise", "Moyennement à l'aise", "Débutant"] },
      { id: "q7", type: "QCU", question: "Savez-vous ce qu'est un CMS (ex. WordPress) ?", options: OUI_NON },
    ],
  },
  {
    // Création / développement d'activité de formation
    motsCles: /organisme de formation|activité de formation|formateur|ingénierie|digitalis/i,
    questions: [
      { id: "q1", type: "QCU", question: "Le NDA (numéro de déclaration d'activité) est délivré par :", options: ["La DREETS (préfet de région)", "Pôle emploi", "L'URSSAF"] },
      { id: "q2", type: "QCU", question: "La certification Qualiopi est obligatoire pour :", options: ["Tous les organismes", "Les organismes souhaitant des financements publics/mutualisés", "Personne"] },
      { id: "q3", type: "QCM", question: "Quels documents sont obligatoires dans un dossier de formation ? (plusieurs réponses)", options: ["Convention ou contrat", "Feuille d'émargement", "Programme", "Carte de visite"] },
      { id: "q4", type: "COURTE", question: "Quel est votre projet de formation (public visé, thématique) ?" },
      { id: "q5", type: "QCU", question: "Avez-vous déjà animé des formations ?", options: ["Oui, régulièrement", "Oui, occasionnellement", "Non"] },
      { id: "q6", type: "QCU", question: "Connaissez-vous le CPF et son fonctionnement ?", options: ["Oui", "Vaguement", "Non"] },
      { id: "q7", type: "QCU", question: "Un BPF (bilan pédagogique et financier) se dépose :", options: ["Chaque année", "Tous les 5 ans", "Jamais"] },
    ],
  },
];

// Banque générique (si aucun mot-clé ne correspond)
const GENERIQUES: PositionnementQuestion[] = [
  { id: "q1", type: "QCU", question: "Comment évaluez-vous vos connaissances actuelles dans le domaine de cette formation ?", options: ["Débutant", "Notions", "Intermédiaire", "Avancé"] },
  { id: "q2", type: "QCU", question: "Avez-vous des contraintes particulières (rythme, matériel, mobilité) à signaler ?", options: OUI_NON },
  { id: "q3", type: "COURTE", question: "Si oui, précisez vos contraintes ou besoins d'adaptation." },
  { id: "q4", type: "QCM", question: "Quels supports d'apprentissage préférez-vous ? (plusieurs réponses)", options: ["Démonstrations pratiques", "Supports écrits", "Vidéos", "Échanges de groupe"] },
  { id: "q5", type: "QCU", question: "Utilisez-vous un ordinateur ou un smartphone au quotidien ?", options: ["Les deux", "Smartphone uniquement", "Rarement"] },
  { id: "q6", type: "COURTE", question: "Avez-vous une expérience professionnelle en lien avec cette formation ? Décrivez-la brièvement." },
  { id: "q7", type: "QCU", question: "Êtes-vous en situation de handicap nécessitant une adaptation de la formation ?", options: ["Non", "Oui (le référent handicap vous contactera)"] },
];

function estQuestionValide(q: unknown): q is PositionnementQuestion {
  if (!q || typeof q !== "object") return false;
  const o = q as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.question === "string" &&
    (o.type === "QCU" || o.type === "QCM" || o.type === "COURTE")
  );
}

/**
 * Retourne les questions du test de positionnement d'une formation :
 * questions personnalisées (JSON stocké) si présentes, sinon banque
 * thématique selon l'intitulé, sinon banque générique. Les questions
 * communes (expérience / attentes) sont ajoutées en tête.
 */
export function questionsPourFormation(
  titreFormation: string,
  stored?: unknown,
): PositionnementQuestion[] {
  if (Array.isArray(stored)) {
    const perso = stored.filter(estQuestionValide);
    if (perso.length > 0) return perso;
  }
  const banque = BANQUES.find((b) => b.motsCles.test(titreFormation));
  return [...COMMUNES, ...(banque ? banque.questions : GENERIQUES)];
}
