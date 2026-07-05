// Documents qui se signent (sur place ou électroniquement). Utilisé pour la
// validation « signé sur place » document par document. Module normal (pas
// "use server") pour être importable côté client.

export const SIGNABLE_DOCS: { type: string; label: string }[] = [
  { type: "FICHE_INSCRIPTION", label: "Fiche d'inscription" },
  { type: "CONTRAT_FORMATION", label: "Contrat de formation" },
  { type: "CONVENTION_FORMATION", label: "Convention de formation" },
  { type: "REGLEMENT_INTERIEUR", label: "Règlement intérieur" },
];
