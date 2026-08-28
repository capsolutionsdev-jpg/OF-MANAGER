// Totaux d'un devis — arrondis au centime, même méthode que `calcMontants`
// (facture éditeur) : arrondi de chaque ligne, somme arrondie, puis TVA et TTC
// arrondis. Pur, sans dépendance serveur. Corrige A06-008 (devis non arrondi +
// ligne TVA = ttc − ht incohérente avec le taux).

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcDevisTotals(
  lignes: { quantite: number; puHT: number }[],
  tva: number,
): { montantHT: number; montantTva: number; montantTTC: number } {
  const montantHT = round2(lignes.reduce((s, l) => s + round2(l.quantite * l.puHT), 0));
  const montantTva = round2(montantHT * (tva / 100));
  const montantTTC = round2(montantHT + montantTva);
  return { montantHT, montantTva, montantTTC };
}
