// Helpers d'émargement partagés (non "use server").

/**
 * Jours d'une session (séances si générées, sinon jours OUVRÉS de la plage),
 * normalisés à minuit. Quand aucune séance n'est explicitement planifiée, on
 * énumère les jours ouvrés (lun→ven) — pas d'émargement le week-end. Repli : si
 * la plage tombe entièrement sur un week-end, on garde ces jours (jamais vide).
 */
export function joursSession(
  seances: { date: Date }[],
  dateDebut: Date,
  dateFin: Date,
): Date[] {
  const norm = (x: Date) => {
    const d = new Date(x);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  if (seances.length > 0) return seances.map((s) => norm(s.date));
  const tous: Date[] = [];
  const ouvres: Date[] = [];
  const d = norm(dateDebut);
  const end = norm(dateFin);
  let guard = 0;
  while (d <= end && guard < 60) {
    const cur = new Date(d);
    tous.push(cur);
    const jour = cur.getDay(); // 0 = dimanche, 6 = samedi
    if (jour !== 0 && jour !== 6) ouvres.push(cur);
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return ouvres.length > 0 ? ouvres : tous;
}

/** Clé de jour locale stable (indépendante du fuseau UTC). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
