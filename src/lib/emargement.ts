// Helpers d'émargement partagés (non "use server").

import { estJourFerie } from "@/lib/jours-feries";

// Borne haute de sécurité de l'énumération jour par jour : ~2 ans de calendrier.
// Remplace l'ancien plafond de 60 jours qui TRONQUAIT silencieusement l'émargement
// des formations longues (titre pro, alternance…) au 60e jour (A06-004). Au-delà
// de 2 ans, les séances doivent être planifiées explicitement.
const MAX_JOURS = 732;

/**
 * Jours d'une session (séances si générées, sinon jours OUVRÉS de la plage),
 * normalisés à minuit. Quand aucune séance n'est explicitement planifiée, on
 * énumère les jours ouvrés (lun→ven, hors jours fériés) — pas d'émargement le
 * week-end ni un férié (A06-019). Repli : si la plage tombe entièrement sur des
 * jours non ouvrés, on garde ces jours (jamais vide).
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
  while (d <= end && guard < MAX_JOURS) {
    const cur = new Date(d);
    tous.push(cur);
    const jour = cur.getDay(); // 0 = dimanche, 6 = samedi
    if (jour !== 0 && jour !== 6 && !estJourFerie(cur)) ouvres.push(cur);
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return ouvres.length > 0 ? ouvres : tous;
}

/** Clé de jour locale stable (indépendante du fuseau UTC). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
