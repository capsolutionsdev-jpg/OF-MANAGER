// Construction (pure) des lignes de suivi à 6 mois — partagée par la page de
// pilotage (tableau) et l'export CSV, pour éviter toute divergence de logique.
import {
  suivi6moisStatut,
  echeanceSuivi6Mois,
  SITUATION_LABELS,
  LIEN_FORMATION_LABELS,
  type Suivi6MoisReponses,
  type Suivi6MoisStatut,
} from "@/lib/suivi6mois";

/** Champs bruts (issus de la base) nécessaires au calcul d'une ligne. */
export type Suivi6MoisRowInput = {
  id: string;
  candidatPrenom: string;
  candidatNom: string;
  candidatEmail: string;
  formationTitre: string;
  dateFin: Date;
  suivi6moisToken: string | null;
  suivi6moisSentAt: Date | null;
  suivi6moisRelanceAt: Date | null;
  suivi6moisRelanceCount: number;
  suivi6moisCompletedAt: Date | null;
  suivi6moisJson: unknown;
};

/** Ligne sérialisée (dates en ISO) prête pour le composant client / le CSV. */
export type Suivi6MoisRow = {
  id: string;
  candidat: string;
  email: string;
  formation: string;
  dateFin: string; // ISO
  echeance: string; // ISO (J+6)
  statut: Suivi6MoisStatut;
  envoyeLe: string | null; // ISO
  relanceLe: string | null; // ISO
  relanceCount: number;
  reponduLe: string | null; // ISO
  token: string | null;
  situation: string; // libellé
  lienFormation: string; // libellé
  poste: string;
  employeur: string;
  apport: string;
};

export function buildSuivi6MoisRow(i: Suivi6MoisRowInput, now: Date): Suivi6MoisRow {
  const r = (i.suivi6moisJson ?? {}) as Suivi6MoisReponses;
  return {
    id: i.id,
    candidat: `${i.candidatPrenom} ${i.candidatNom}`.trim(),
    email: i.candidatEmail,
    formation: i.formationTitre,
    dateFin: i.dateFin.toISOString(),
    echeance: echeanceSuivi6Mois(i.dateFin).toISOString(),
    statut: suivi6moisStatut(i, now),
    envoyeLe: i.suivi6moisSentAt ? i.suivi6moisSentAt.toISOString() : null,
    relanceLe: i.suivi6moisRelanceAt ? i.suivi6moisRelanceAt.toISOString() : null,
    relanceCount: i.suivi6moisRelanceCount,
    reponduLe: i.suivi6moisCompletedAt ? i.suivi6moisCompletedAt.toISOString() : null,
    token: i.suivi6moisToken,
    situation: r.situation ? SITUATION_LABELS[r.situation] ?? r.situation : "",
    lienFormation: r.lienFormation ? LIEN_FORMATION_LABELS[r.lienFormation] ?? r.lienFormation : "",
    poste: r.intitulePoste ?? "",
    employeur: r.employeur ?? "",
    apport: r.apportFormation != null ? String(r.apportFormation) : "",
  };
}
