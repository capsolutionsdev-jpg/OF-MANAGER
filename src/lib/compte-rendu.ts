// Questions du compte-rendu pédagogique formateur (adapté du modèle ASPR Formation).
export const CR_QUESTIONS: { key: string; label: string; type: "text" | "ouinon" }[] =
  [
    {
      key: "conditions",
      label:
        "Conditions matérielles de réalisation (salle, matériels et équipements…)",
      type: "text",
    },
    {
      key: "difficultes",
      label: "Difficultés rencontrées (discipline, matériel, autres…)",
      type: "text",
    },
    {
      key: "besoins",
      label: "Autres besoins nécessaires aux formateurs",
      type: "text",
    },
    {
      key: "documentation",
      label:
        "La documentation remise aux stagiaires est-elle adaptée, actualisée et suffisante ?",
      type: "text",
    },
    {
      key: "remarques",
      label: "Remarques particulières / Suggestions",
      type: "text",
    },
    {
      key: "rencontreDirection",
      label: "Rencontre avec la direction du centre de formation",
      type: "ouinon",
    },
  ];

export type CompteRenduReponses = Record<string, string>;
