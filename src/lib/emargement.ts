// Helpers d'émargement partagés (non "use server").

/** Jours d'une session (séances si générées, sinon plage de dates), normalisés à minuit. */
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
  const days: Date[] = [];
  const d = norm(dateDebut);
  const end = norm(dateFin);
  let guard = 0;
  while (d <= end && guard < 60) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return days;
}

/** Clé de jour locale stable (indépendante du fuseau UTC). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
