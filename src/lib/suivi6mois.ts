// Enquête de suivi à 6 mois (Qualiopi — Référentiel National Qualité, indicateur 11 :
// l'OF évalue l'atteinte des objectifs et le DEVENIR des bénéficiaires). Sert aussi
// au suivi de l'insertion professionnelle (taux d'emploi, lien avec la formation),
// données remontées au BPF.

export type Situation = {
  key: string;
  label: string;
  emploi: boolean; // compte comme « en emploi » dans les statistiques
};

export const SITUATIONS: Situation[] = [
  { key: "emploi_cdi", label: "En emploi — CDI", emploi: true },
  { key: "emploi_cdd", label: "En emploi — CDD / mission d'intérim", emploi: true },
  { key: "independant", label: "Indépendant·e / création ou reprise d'entreprise", emploi: true },
  { key: "alternance", label: "En alternance / contrat de professionnalisation", emploi: true },
  { key: "recherche", label: "En recherche d'emploi", emploi: false },
  { key: "formation", label: "En formation / reprise d'études", emploi: false },
  { key: "inactif", label: "Sans activité professionnelle / autre", emploi: false },
];

export const SITUATION_LABELS: Record<string, string> = Object.fromEntries(
  SITUATIONS.map((s) => [s.key, s.label]),
);
export const EMPLOI_KEYS = new Set(SITUATIONS.filter((s) => s.emploi).map((s) => s.key));

export const LIEN_FORMATION = [
  { key: "oui", label: "Oui, directement en lien" },
  { key: "partiel", label: "En partie" },
  { key: "non", label: "Non" },
];
export const LIEN_FORMATION_LABELS: Record<string, string> = Object.fromEntries(
  LIEN_FORMATION.map((l) => [l.key, l.label]),
);

// Forme des réponses stockées dans Inscription.suivi6moisJson
export type Suivi6MoisReponses = {
  situation: string; // clé SITUATIONS
  lienFormation?: string; // clé LIEN_FORMATION (si en emploi)
  intitulePoste?: string;
  employeur?: string;
  apportFormation?: number; // 0..10 : la formation a-t-elle aidé ?
  commentaire?: string;
};
