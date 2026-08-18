// =============================================================
//  ANIMATION PAR FORMATEUR sur une session.
//
//  Un formateur peut animer TOUTE la session (complet) ou seulement CERTAINS
//  jours (partiel). Le nombre de jours couverts pilote le contrat de
//  sous-traitance + la facturation des formateurs EXTERNES. Fonctions PURES
//  (testées) — pas d'accès base.
// =============================================================

export type AnimationConfig = { formateurId: string; complet: boolean; jours: string[] };

/** Liste des jours (ISO « AAAA-MM-JJ ») entre deux dates INCLUSES — PUR, sans dérive de fuseau. */
export function joursSession(dateDebut: string, dateFin: string): string[] {
  const parse = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? "");
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
  };
  let cur = parse(dateDebut);
  const end = parse(dateFin);
  if (Number.isNaN(cur) || Number.isNaN(end) || end < cur) return [];
  const out: string[] = [];
  while (cur <= end && out.length < 366) {
    out.push(new Date(cur).toISOString().slice(0, 10));
    cur += 86_400_000;
  }
  return out;
}

/** Normalise une valeur JSON (issue de la base) en config d'animation typée. */
export function parseAnimation(value: unknown): AnimationConfig[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const o = v as Record<string, unknown>;
    if (typeof o.formateurId !== "string") return [];
    return [
      {
        formateurId: o.formateurId,
        complet: o.complet !== false, // défaut = complet
        jours: Array.isArray(o.jours) ? o.jours.filter((j): j is string => typeof j === "string") : [],
      },
    ];
  });
}

/**
 * Nombre de jours animés par un formateur donné : complet (ou config absente) →
 * total de la session ; partiel → nombre de jours cochés (borné au total). PUR.
 */
export function nbJoursFormateur(
  config: AnimationConfig[] | null | undefined,
  formateurId: string,
  totalJours: number,
): number {
  const c = config?.find((a) => a.formateurId === formateurId);
  if (!c || c.complet) return totalJours;
  return Math.min(c.jours.length, totalJours);
}
