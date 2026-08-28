import type { PresenceStatut, SeanceType } from "@prisma/client";

// Assiduité d'un apprenant → heures RÉELLEMENT suivies + taux, à partir des
// présences émargées (A06-001). Corrige le certificat de réalisation / le BPF
// qui affichaient la durée PLANIFIÉE quelle que soit la présence réelle.
//
// Pur, sans dépendance serveur (donc testable). PRESENT ou RETARD = séance
// suivie ; ABSENT, EXCUSE ou non émargée (statut null) = non suivie. Les heures
// suivies = durée prévue proratisée par le taux (jamais supérieures au prévu).

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Poids d'une séance en demi-journées : journée = 2, matin/après-midi = 1. */
function poids(type: SeanceType): number {
  return type === "JOURNEE" ? 2 : 1;
}

export type Assiduite = {
  poidsTotal: number; // total en demi-journées
  poidsSuivi: number; // demi-journées réellement suivies
  tauxPct: number; // 0..100
  heuresSuivies: number | null; // heures suivies (null si durée prévue inconnue ou aucune séance)
};

export function calcAssiduite(
  seances: { type: SeanceType; statut: PresenceStatut | null }[],
  dureeHeures: number | null,
): Assiduite {
  const poidsTotal = seances.reduce((s, x) => s + poids(x.type), 0);
  const poidsSuivi = seances.reduce(
    (s, x) => s + (x.statut === "PRESENT" || x.statut === "RETARD" ? poids(x.type) : 0),
    0,
  );
  const ratio = poidsTotal > 0 ? poidsSuivi / poidsTotal : 0;
  const tauxPct = poidsTotal > 0 ? Math.round(ratio * 100) : 0;
  const heuresSuivies =
    dureeHeures != null && poidsTotal > 0 ? round1(dureeHeures * ratio) : null;
  return { poidsTotal, poidsSuivi, tauxPct, heuresSuivies };
}

/**
 * Assiduité d'un apprenant à partir des séances d'une session (chacune avec la
 * liste de ses présences). Renvoie null s'il n'y a pas d'apprenant rattaché ou
 * aucune séance (émargement non fait) → le document retombe sur la durée prévue.
 */
export function assiduiteFromSession(
  seances: { type: SeanceType; presences: { statut: PresenceStatut; apprenantId: string }[] }[],
  apprenantId: string | null | undefined,
  dureeHeures: number | null,
): Assiduite | null {
  if (!apprenantId || seances.length === 0) return null;
  return calcAssiduite(
    seances.map((se) => ({
      type: se.type,
      statut: se.presences.find((p) => p.apprenantId === apprenantId)?.statut ?? null,
    })),
    dureeHeures,
  );
}
