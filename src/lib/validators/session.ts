import { z } from "zod";
import { Modalite, SessionStatut } from "@prisma/client";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const sessionFormSchema = z
  .object({
    formationId: z.string().trim().min(1, "Choisissez une formation"),
    reference: optionalText,
    dateDebut: z.string().trim().min(1, "Date de début requise"),
    dateFin: z.string().trim().min(1, "Date de fin requise"),
    horaires: optionalText,
    lieu: optionalText,
    dateExamen: optionalText,
    lieuExamen: optionalText,
    salleId: optionalText,
    modalite: z.nativeEnum(Modalite),
    nbPlaces: optionalText,
    statut: z.nativeEnum(SessionStatut),
    tarifFormateurJour: optionalText,
    formateurIds: z.array(z.string()).optional(),
    // Jury(s) d'examen affecté(s) à la session (formations soumises à jury) :
    // chaque juré avec son défraiement personnalisé et la nature de l'examen.
    jurys: z
      .array(
        z.object({
          juryId: z.string().min(1),
          prixEuros: z.string().optional(),
          natureExamen: z.string().optional(),
        }),
      )
      .optional(),
  })
  .refine((d) => !d.dateDebut || !d.dateFin || d.dateFin >= d.dateDebut, {
    message: "La date de fin doit être postérieure ou égale au début.",
    path: ["dateFin"],
  });

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

export const SESSION_STATUT_LABELS: Record<SessionStatut, string> = {
  PLANIFIEE: "Planifiée",
  OUVERTE: "Ouverte",
  COMPLETE: "Complète",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};
