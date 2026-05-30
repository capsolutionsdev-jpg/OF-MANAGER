import { PresenceStatut } from "@prisma/client";

export const PRESENCE_LABELS: Record<PresenceStatut, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  RETARD: "Retard",
  EXCUSE: "Excusé",
};
