// =============================================================
//  Test de français (positionnement linguistique) — commun à toutes
//  les formations. Envoyé par lien le 1er jour (comme le positionnement).
//  Version modernisée en QCM/QCU en ligne (grammaire, genre des noms,
//  négation, conjugaison, orthographe, numératie) + auto-évaluation.
//  Réutilise la structure de question du positionnement (QCU/QCM/COURTE).
// =============================================================

import type { PositionnementQuestion } from "@/lib/positionnement";

export const FRANCAIS_QUESTIONS: PositionnementQuestion[] = [
  { id: "art", type: "QCU", question: "Complétez : « Il y a ___ fleur sur la table. »", options: ["un", "une", "des"] },
  { id: "prep1", type: "QCU", question: "Complétez : « Je vais ___ marché. »", options: ["à le", "au", "aux"] },
  { id: "prep2", type: "QCU", question: "Complétez : « Elle habite ___ Paris. »", options: ["à", "au", "aux"] },
  { id: "fem", type: "QCU", question: "Quel mot est un nom féminin ?", options: ["le piano", "l'armoire", "le filet"] },
  { id: "masc", type: "QCU", question: "Quel mot est un nom masculin ?", options: ["la salle", "le salon", "la cuillère"] },
  { id: "neg", type: "QCU", question: "Mettez à la forme négative : « Je vais au marché. »", options: ["Je ne vais pas au marché", "Je vais pas au marché", "Je non vais au marché"] },
  { id: "passe1", type: "QCU", question: "Complétez au passé : « Ce matin, j'___ du vélo. »", options: ["fais", "ai fait", "faisais"] },
  { id: "passe2", type: "QCU", question: "Complétez : « Hier, je ___ au travail en bus. »", options: ["vais", "suis allé(e)", "irai"] },
  { id: "ortho", type: "QCU", question: "Quel mot est correctement orthographié ?", options: ["acceuil", "accueil", "acueil"] },
  { id: "accord", type: "QCU", question: "Complétez : « Ils ___ contents. »", options: ["sont", "ont", "son"] },
  { id: "calc1", type: "QCU", question: "Combien font 12 + 6 ?", options: ["16", "18", "20"] },
  { id: "calc2", type: "QCU", question: "Combien font 12 × 3 ?", options: ["24", "32", "36"] },
  { id: "calc3", type: "QCU", question: "Combien font 105 − 45 ?", options: ["50", "60", "70"] },
  { id: "presentation", type: "COURTE", question: "Présentez-vous en 2 ou 3 phrases (nom, situation actuelle, objectif de la formation)." },
  { id: "oral", type: "QCU", question: "Comprenez-vous une conversation courante en français ?", options: ["Facilement", "Avec quelques difficultés", "Difficilement"] },
  { id: "ecrit", type: "QCU", question: "Écrivez-vous des e-mails ou des courriers en français ?", options: ["Souvent", "Parfois", "Jamais"] },
];
