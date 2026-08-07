import { z } from "zod";
import { Modalite, Academy, VitrineStatut } from "@prisma/client";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const formationFormSchema = z.object({
  titre: z.string().trim().min(1, "Le titre est requis"),
  reference: z.string().trim().min(1, "La référence est requise"),
  certification: optionalText,
  duree: optionalText,
  dureeHeures: optionalText, // saisi en texte, converti côté serveur
  dureeJours: optionalText, // durée en jours (texte → Int côté serveur)
  tarif: optionalText,
  modalite: z.nativeEnum(Modalite),
  academy: z.nativeEnum(Academy).or(z.literal("")).optional(),
  // Publication sur le site vitrine (piloté depuis la console).
  vitrineStatut: z.nativeEnum(VitrineStatut).optional(),
  numeroAgrement: optionalText,
  // Contenu de présentation vitrine (formations créées EN console).
  vitrineTagline: optionalText,
  vitrineDescription: optionalText,
  vitrineImageUrl: optionalText,
  vitrineCompetences: optionalText, // 1 compétence par ligne, converti côté serveur
  vitrineValidite: optionalText,
  vitrineModalites: optionalText,
  // Formules (site vitrine) : heures + prix par formule (présentiel / mixte / e-learning).
  // Seuls heures & prix sont saisis ; le libellé et le descriptif sont fixes (FORMULE_DEFS).
  formulePresentielHeures: optionalText,
  formulePresentielPrix: optionalText,
  formuleMixteHeures: optionalText,
  formuleMixtePrix: optionalText,
  formuleElearningHeures: optionalText,
  formuleElearningPrix: optionalText,
  objectifs: optionalText,
  programme: optionalText,
  prerequis: optionalText,
  publicVise: optionalText,
  methodesPedagogiques: optionalText,
  modalitesEvaluation: optionalText,
  conditionsAcces: optionalText,
  delaiAcces: optionalText,
  // Pièces du dossier administratif : saisies en texte (1 par ligne), converties en tableau côté serveur
  piecesAttendues: optionalText,
  // Formation soumise à un examen (→ convocation d'examen).
  examen: z.boolean().optional(),
  // Grille de certification officielle INRS à pré-remplir ("SST" / "MAC_SST").
  grilleInrs: z.string().optional(),
  // Formation diplômante (→ suivi de diplômes + attestation de remise).
  diplomante: z.boolean().optional(),
  // Examen soumis à un jury (→ gestion de jury) + nombre de jurés attendus.
  soumisJury: z.boolean().optional(),
  nbJury: z.string().optional(),
});

export type FormationFormValues = z.infer<typeof formationFormSchema>;

// ── Formules du site vitrine ────────────────────────────────────────────────
// Une formule = un format d'une même formation, avec ses heures et son prix.
// Le libellé et le descriptif sont figés ici (cohérents avec le site vitrine) ;
// seuls les heures et le prix sont saisis dans la console.
export type VitrineFormule = {
  key: string;
  label: string;
  heures: string;
  prix: string;
  description: string;
};

export const FORMULE_DEFS: { key: string; label: string; description: string }[] = [
  {
    key: "presentiel",
    label: "Présentiel",
    description:
      "Formation intégralement en centre, en groupe restreint, encadrée par un formateur. Un accompagnement rythmé et intensif jusqu'à l'examen.",
  },
  {
    key: "mixte",
    label: "Mixte — 1 jour de préparation",
    description:
      "Vous révisez à votre rythme sur la plateforme e-learning OFLMS, puis vous consolidez l'essentiel lors d'une journée de préparation intensive en présentiel juste avant l'examen.",
  },
  {
    key: "elearning",
    label: "100% e-learning",
    description:
      "Formation 100% à distance sur notre plateforme e-learning OFLMS : cours, quiz et examens blancs disponibles 24h/24, où que vous soyez.",
  },
];

// Construit le tableau de formules à stocker (JSON) à partir des 6 champs saisis.
// Renvoie `null` si aucune heure/aucun prix n'est renseigné → le site vitrine
// conserve alors ses formules statiques par défaut.
export function buildVitrineFormules(v: FormationFormValues): VitrineFormule[] | null {
  const rows = [
    { def: FORMULE_DEFS[0], heures: v.formulePresentielHeures, prix: v.formulePresentielPrix },
    { def: FORMULE_DEFS[1], heures: v.formuleMixteHeures, prix: v.formuleMixtePrix },
    { def: FORMULE_DEFS[2], heures: v.formuleElearningHeures, prix: v.formuleElearningPrix },
  ];
  const filled = (s?: string) => (s && s.trim() !== "" ? s.trim() : "");
  if (!rows.some((r) => filled(r.heures) || filled(r.prix))) return null;
  return rows.map((r) => ({
    key: r.def.key,
    label: r.def.label,
    heures: filled(r.heures) || "Sur demande",
    prix: filled(r.prix) || "Sur devis",
    description: r.def.description,
  }));
}

export const MODALITE_LABELS: Record<Modalite, string> = {
  PRESENTIEL: "Présentiel",
  DISTANCIEL: "À distance",
  MIXTE: "Mixte (blended)",
};

export const ACADEMY_LABELS: Record<Academy, string> = {
  DIGITAL: "CAP Digital Academy",
  SAFETY: "CAP Safety Academy",
  TRANSPORT: "CAP Transport Academy",
  LANGUE: "CAP Language Academy",
};

export const ACADEMY_ORDER: Academy[] = ["DIGITAL", "SAFETY", "TRANSPORT", "LANGUE"];

export const VITRINE_STATUT_LABELS: Record<VitrineStatut, string> = {
  MASQUEE: "Masquée (pas sur le site)",
  PUBLIEE: "Publiée (visible sur le site)",
  SUSPENDUE: "Suspendue (temporairement retirée)",
};
