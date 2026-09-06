// Conformité CPF : le test de positionnement doit être RÉALISÉ avant la création
// du dossier CPF, au moins J-1 jour ouvré (règle légale). Module PUR (pas de base,
// pas de réseau) → testable en isolation. On calcule et on VÉRIFIE l'antériorité ;
// on n'antidate jamais (la date de réalisation reste la vraie).
//
// v1 : week-ends exclus (samedi/dimanche). Jours fériés hors périmètre pour l'instant.

/** Blocage strict : le test doit être réalisé au moins ce nombre de jours ouvrés avant le dossier. */
export const MIN_JOURS_OUVRES = 1;
/** Cible recommandée (affichée comme échéance conseillée). */
export const CIBLE_JOURS_OUVRES = 2;

/** Vrai si la date tombe un week-end (samedi ou dimanche). */
export function estWeekend(date: Date): boolean {
  const j = date.getDay();
  return j === 0 || j === 6;
}

/** Normalise à une date SANS heure (minuit local) pour comparer des jours. */
function jourSeul(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Renvoie la date située `n` jours OUVRÉS avant `date` (les samedis/dimanches ne
 * comptent pas). Heure ignorée (renvoie un jour à minuit local).
 */
export function businessDaysBefore(date: Date, n: number): Date {
  const d = jourSeul(date);
  let restant = n;
  while (restant > 0) {
    d.setDate(d.getDate() - 1);
    if (!estWeekend(d)) restant--;
  }
  return d;
}

/**
 * Date limite de réalisation du test = `min` jours ouvrés avant la date de création
 * du dossier CPF. Le test doit être réalisé au plus tard ce jour-là.
 */
export function positionnementDeadline(dossierDate: Date, min: number = MIN_JOURS_OUVRES): Date {
  return businessDaysBefore(dossierDate, min);
}

/**
 * Le test (réalisé le `realisation`) est-il antérieur conforme au dossier CPF
 * (créé le `dossier`) ? Vrai si la réalisation est AU PLUS TARD à la date limite
 * (J-`min` ouvré avant le dossier). Comparaison en jour (heure ignorée).
 */
export function estAnterieurConforme(
  realisation: Date,
  dossier: Date,
  min: number = MIN_JOURS_OUVRES,
): boolean {
  const limite = positionnementDeadline(dossier, min);
  return jourSeul(realisation).getTime() <= limite.getTime();
}

export type ConformiteCpfInput = {
  /** Le financement de l'inscription est-il le CPF ? */
  financementCpf: boolean;
  /** Date de création du dossier CPF (null si pas encore ouvert). */
  cpfDossierCreeLe: Date | null;
  /** Date de réalisation RÉELLE du test de positionnement (null si non réalisé). */
  positionnementCompletedAt: Date | null;
  /** Une dérogation a-t-elle été accordée (cas 3) ? */
  derogation: boolean;
};

export type ConformiteCpfStatut =
  | "NON_CPF" // pas de financement CPF → hors règle
  | "DOSSIER_ABSENT" // dossier CPF pas encore ouvert → rien à bloquer
  | "CONFORME" // test réalisé à temps (≤ J-min ouvré avant le dossier)
  | "TEST_MANQUANT" // dossier ouvert mais test non réalisé → bloquant
  | "NON_ANTERIEUR" // test réalisé APRÈS la limite → bloquant
  | "DEROGATION"; // non conforme mais dérogation tracée → non bloquant

export type ConformiteCpf = {
  statut: ConformiteCpfStatut;
  /** Faut-il empêcher la finalisation du dossier CPF ? */
  bloquant: boolean;
  /** Message explicatif (UI). */
  message?: string;
  /** Date limite de réalisation (quand le dossier est renseigné). */
  deadline?: Date;
};

/**
 * Décide de la conformité CPF d'une inscription (blocage / dérogation). Fonction
 * PURE — encode la règle « test réalisé avant le dossier CPF » sans jamais
 * antidater : on constate la réalité, on la bloque ou on la trace, on ne la
 * maquille pas. Cf. cas 1-3 du design.
 */
export function evaluerConformiteCpf(
  input: ConformiteCpfInput,
  min: number = MIN_JOURS_OUVRES,
): ConformiteCpf {
  if (!input.financementCpf) return { statut: "NON_CPF", bloquant: false };
  if (!input.cpfDossierCreeLe) return { statut: "DOSSIER_ABSENT", bloquant: false };

  const deadline = positionnementDeadline(input.cpfDossierCreeLe, min);

  if (!input.positionnementCompletedAt) {
    return input.derogation
      ? {
          statut: "DEROGATION",
          bloquant: false,
          deadline,
          message: "Dérogation : test de positionnement non réalisé avant le dossier CPF.",
        }
      : {
          statut: "TEST_MANQUANT",
          bloquant: true,
          deadline,
          message:
            "Le test de positionnement doit être réalisé avant l'ouverture du dossier CPF. Faites-le passer d'abord.",
        };
  }

  if (estAnterieurConforme(input.positionnementCompletedAt, input.cpfDossierCreeLe, min)) {
    return { statut: "CONFORME", bloquant: false, deadline };
  }

  return input.derogation
    ? {
        statut: "DEROGATION",
        bloquant: false,
        deadline,
        message: "Dérogation : test réalisé après la date limite (conservé avec sa vraie date).",
      }
    : {
        statut: "NON_ANTERIEUR",
        bloquant: true,
        deadline,
        message: `Le test doit être réalisé au plus tard le ${deadline.toLocaleDateString(
          "fr-FR",
        )} (J-${min} ouvré avant la création du dossier CPF).`,
      };
}
