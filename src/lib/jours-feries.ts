// Jours fériés légaux français (métropole) — fixes + mobiles (basés sur Pâques).
// Sert à exclure les fériés de l'énumération des jours d'émargement (A06-019) :
// aucune feuille de présence n'est attendue un jour férié.

/** Dimanche de Pâques (algorithme de Butcher/Meeus) pour une année donnée. */
function paques(annee: number): Date {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31); // 3 = mars, 4 = avril
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(annee, mois - 1, jour);
}

const cle = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Ensemble des clés (AAAA-M-J locales) des jours fériés d'une année. */
export function joursFeriesFR(annee: number): Set<string> {
  const p = paques(annee);
  const decale = (base: Date, n: number) => {
    const x = new Date(base);
    x.setDate(x.getDate() + n);
    return x;
  };
  const dates = [
    new Date(annee, 0, 1), // Jour de l'an
    decale(p, 1), // Lundi de Pâques
    new Date(annee, 4, 1), // Fête du travail (1er mai)
    new Date(annee, 4, 8), // Victoire 1945 (8 mai)
    decale(p, 39), // Ascension
    decale(p, 50), // Lundi de Pentecôte
    new Date(annee, 6, 14), // Fête nationale (14 juillet)
    new Date(annee, 7, 15), // Assomption (15 août)
    new Date(annee, 10, 1), // Toussaint (1er novembre)
    new Date(annee, 10, 11), // Armistice (11 novembre)
    new Date(annee, 11, 25), // Noël (25 décembre)
  ];
  return new Set(dates.map(cle));
}

/** Vrai si la date (locale) est un jour férié légal français. */
export function estJourFerie(d: Date): boolean {
  return joursFeriesFR(d.getFullYear()).has(cle(d));
}
