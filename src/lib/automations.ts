// Catalogue des automatisations du parcours + résolution de la config PAR
// organisme (matrice « quoi / quand / canal » + modèles), stockée dans
// Organisme.automationsConfig (Json). Repli sur les réglages globaux/défauts.

export type Canal = "email" | "sms" | "both";

export type AutomationEvent = {
  key: string;
  label: string;
  quand: string; // description du déclencheur (lecture)
  defaultOn: boolean;
  smsable: boolean; // le SMS a-t-il du sens pour cet événement ?
  defaultSubject?: string; // modèle e-mail par défaut (sujet)
};

// Variables disponibles dans les modèles (substituées à l'envoi).
export const AUTOMATION_VARS = [
  "{prenom}", "{nom}", "{formation}", "{date_debut}", "{date_fin}",
  "{horaires}", "{lieu}", "{organisme}", "{representant}", "{lien}",
];

export const AUTOMATION_EVENTS: AutomationEvent[] = [
  { key: "convocation", label: "Convocation", quand: "Quelques jours avant le début (délai configurable)", defaultOn: true, smsable: true },
  { key: "rappel", label: "Rappel J-1", quand: "24 h avant le début de la formation", defaultOn: true, smsable: true },
  { key: "convocation_examen", label: "Convocation à l'examen", quand: "Avant l'examen — formations à examen (TFP APS)", defaultOn: true, smsable: true },
  { key: "attestation_entree", label: "Attestation d'entrée", quand: "Le 1er jour de la session", defaultOn: true, smsable: false },
  { key: "positionnement", label: "Test de positionnement", quand: "Le 1er jour (lien en ligne)", defaultOn: true, smsable: true },
  { key: "satisfaction", label: "Enquête de satisfaction", quand: "À la fin de la formation", defaultOn: true, smsable: true },
  { key: "satisfaction_entreprise", label: "Satisfaction entreprise (B2B)", quand: "À la fin — clients pro", defaultOn: true, smsable: false },
  { key: "docs_fin", label: "Documents de fin (attestation + certificat)", quand: "À la fin de la formation", defaultOn: true, smsable: false },
  { key: "compte_rendu", label: "Compte rendu formateur", quand: "À la fin — au formateur", defaultOn: true, smsable: false },
  { key: "emargement", label: "Lien d'émargement", quand: "Chaque demi-journée (matin / après-midi)", defaultOn: true, smsable: true },
  { key: "suivi_6mois", label: "Enquête de suivi à 6 mois (Qualiopi)", quand: "6 mois après la fin — devenir/insertion pro", defaultOn: true, smsable: true },
];

export type AutomationRule = {
  on?: boolean;
  channel?: Canal;
  subject?: string; // override modèle e-mail
  body?: string; // override modèle e-mail / SMS
  delayDays?: number; // pour la convocation (J-n)
};

export type AutomationsConfig = Record<string, AutomationRule>;

/**
 * Config effective d'un événement pour un organisme : la matrice de l'OF prime,
 * sinon repli sur `fallbackOn` (réglage global) puis sur le défaut du catalogue.
 */
export function effectiveAutomation(
  cfg: AutomationsConfig | null | undefined,
  key: string,
  fallbackOn?: boolean,
): { on: boolean; channel: Canal; subject?: string; body?: string; delayDays?: number } {
  const ev = AUTOMATION_EVENTS.find((e) => e.key === key);
  const rule = (cfg ?? {})[key];
  const on = rule?.on ?? fallbackOn ?? ev?.defaultOn ?? true;
  const channel: Canal = rule?.channel ?? "email";
  return { on, channel, subject: rule?.subject, body: rule?.body, delayDays: rule?.delayDays };
}

export function parseAutomationsConfig(raw: unknown): AutomationsConfig {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as AutomationsConfig; } catch { return {}; }
  }
  if (typeof raw === "object") return raw as AutomationsConfig;
  return {};
}
