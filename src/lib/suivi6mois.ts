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

// ── Échéance, statut & éligibilité de l'enquête à 6 mois ──────────────────────
// L'échéance « J+6 » n'est pas stockée : elle se calcule à la volée depuis la fin
// de formation. C'est aussi la « date de réalisation » officielle imprimée sur le
// document Qualiopi (indépendante de la date réelle de réponse du candidat).

/** Nombre de jours pendant lesquels l'envoi AUTOMATIQUE reste autorisé après
 *  l'échéance J+6. Au-delà, l'enquête n'est plus envoyée par le cron (elle reste
 *  « non envoyée » et doit être déclenchée manuellement) → évite une vague
 *  d'e-mails rétroactifs vers d'anciens contacts lors d'un déploiement. */
export const SUIVI_6MOIS_GRACE_DAYS = 15;

export type Suivi6MoisStatut = "A_VENIR" | "NON_ENVOYE" | "EN_ATTENTE" | "FAIT";

export const SUIVI_6MOIS_STATUT_LABELS: Record<Suivi6MoisStatut, string> = {
  A_VENIR: "À venir",
  NON_ENVOYE: "Non envoyé",
  EN_ATTENTE: "Envoyé, en attente",
  FAIT: "Fait",
};

/** État minimal d'une inscription nécessaire au calcul du statut / de l'éligibilité. */
export type Suivi6MoisEtat = {
  dateFin: Date;
  suivi6moisSentAt?: Date | null;
  suivi6moisCompletedAt?: Date | null;
};

/** Échéance de l'enquête = fin de formation + 6 mois (« J+6 »). */
export function echeanceSuivi6Mois(dateFin: Date): Date {
  const d = new Date(dateFin);
  d.setMonth(d.getMonth() + 6);
  return d;
}

/** Statut de suivi d'une inscription, à une date `now` donnée. */
export function suivi6moisStatut(e: Suivi6MoisEtat, now: Date): Suivi6MoisStatut {
  if (e.suivi6moisCompletedAt) return "FAIT";
  if (e.suivi6moisSentAt) return "EN_ATTENTE";
  return now >= echeanceSuivi6Mois(e.dateFin) ? "NON_ENVOYE" : "A_VENIR";
}

/** L'inscription est-elle éligible à un envoi AUTOMATIQUE (cron) à la date `now` ?
 *  Vrai uniquement dans la fenêtre [J+6 ; J+6 + graceDays], jamais envoyée ni
 *  répondue. L'envoi manuel / la relance ignorent volontairement cette borne. */
export function suivi6moisAutoEligible(
  e: Suivi6MoisEtat,
  now: Date,
  graceDays: number = SUIVI_6MOIS_GRACE_DAYS,
): boolean {
  if (e.suivi6moisSentAt || e.suivi6moisCompletedAt) return false;
  const echeance = echeanceSuivi6Mois(e.dateFin);
  if (now < echeance) return false;
  const limite = new Date(echeance);
  limite.setDate(limite.getDate() + graceDays);
  return now <= limite;
}

/** Valide strictement une signature en data URL base64 (PNG/JPEG). Défense en
 *  profondeur : empêche qu'une valeur forgée casse l'attribut src du HTML du PDF
 *  (le gabarit échappe déjà la valeur, ceci rejette l'entrée en amont). */
export function isValidSignatureDataUrl(s?: string | null): boolean {
  return typeof s === "string" && /^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=]+$/.test(s);
}
