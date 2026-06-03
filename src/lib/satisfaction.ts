// Questionnaire de satisfaction « à chaud » (fin de formation).
// Structure simple : critères notés de 1 à 4 + commentaire libre.

export const SATISFACTION_CRITERES: { key: string; label: string }[] = [
  { key: "contenu", label: "Adéquation du contenu avec vos attentes" },
  { key: "animation", label: "Qualité de l'animation / du formateur" },
  { key: "supports", label: "Qualité des supports pédagogiques" },
  { key: "organisation", label: "Organisation (accueil, horaires, lieu)" },
  { key: "rythme", label: "Rythme et durée de la formation" },
  { key: "competences", label: "Compétences acquises / utiles à votre activité" },
];

export const SATISFACTION_NOTES: { value: number; label: string }[] = [
  { value: 4, label: "Très satisfait" },
  { value: 3, label: "Satisfait" },
  { value: 2, label: "Peu satisfait" },
  { value: 1, label: "Insatisfait" },
];

export type SatisfactionReponses = {
  notes: Record<string, number>;
  recommander?: number; // 1 à 10
  commentaire?: string;
};

export function moyenneSatisfaction(r: SatisfactionReponses): number | null {
  const vals = Object.values(r.notes ?? {});
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}
