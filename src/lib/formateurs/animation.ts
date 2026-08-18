// =============================================================
//  ANIMATION PAR FORMATEUR sur une session.
//
//  Un formateur peut animer TOUTE la session (complet) ou seulement CERTAINS
//  jours (partiel). Le nombre de jours couverts pilote le contrat de
//  sous-traitance + la facturation des formateurs EXTERNES. Fonctions PURES
//  (testées) — pas d'accès base.
// =============================================================

export type AnimationConfig = { formateurId: string; complet: boolean; jours: string[] };

/**
 * Liste des jours OUVRÉS (lun→ven, ISO « AAAA-MM-JJ ») entre deux dates INCLUSES.
 * PUR, sans dérive de fuseau. Les week-ends (samedi/dimanche) sont EXCLUS : les OF
 * ne planifient pas les sessions le week-end, et la facturation formateur compte
 * déjà en jours ouvrés (cf. businessDaysBetween). Repli : si la session tombe
 * entièrement sur un week-end, on garde ces jours (jamais de liste vide).
 */
export function joursSession(dateDebut: string, dateFin: string): string[] {
  const parse = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? "");
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
  };
  let cur = parse(dateDebut);
  const end = parse(dateFin);
  if (Number.isNaN(cur) || Number.isNaN(end) || end < cur) return [];
  const tous: string[] = [];
  const ouvres: string[] = [];
  while (cur <= end && tous.length < 366) {
    const d = new Date(cur);
    tous.push(d.toISOString().slice(0, 10));
    const jour = d.getUTCDay(); // 0 = dimanche, 6 = samedi
    if (jour !== 0 && jour !== 6) ouvres.push(d.toISOString().slice(0, 10));
    cur += 86_400_000;
  }
  return ouvres.length > 0 ? ouvres : tous;
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

/**
 * Jours attribués à ≥ 2 formateurs — un jour ne peut être animé que par UN seul
 * formateur (« complet » = toute la session). Renvoie la liste TRIÉE des jours en
 * conflit (vide = pas de chevauchement). PUR.
 */
export function joursEnConflit(config: AnimationConfig[], joursOuvres: string[]): string[] {
  const n = new Map<string, number>();
  for (const a of config) {
    for (const j of a.complet ? joursOuvres : a.jours) n.set(j, (n.get(j) ?? 0) + 1);
  }
  return [...n.entries()]
    .filter(([, c]) => c >= 2)
    .map(([j]) => j)
    .sort();
}
