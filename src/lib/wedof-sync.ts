/**
 * Filtre d'écriture « dernier gagne, sans régression » pour un dossier Wedof.
 *
 * Wedof peut redélivrer ou désordonner ses notifications (registrationFolder.*).
 * Pour éviter qu'un événement plus ANCIEN écrase un état plus récent (ex. SOLDE →
 * EN_COURS), on n'autorise l'écrasement d'une ligne existante QUE si son horodatage
 * source stocké (`wedofMajLe`) est nul ou <= à l'horodatage entrant (A12-006).
 *
 * S'utilise avec `updateMany({ where: wedofOrderedWhere(id, majLe), data })` :
 *  - `count > 0` → mis à jour ;
 *  - `count === 0` → soit la ligne n'existe pas (à créer), soit l'événement entrant
 *    est plus ancien que l'état stocké (à ignorer).
 *
 * Si l'entrant n'a pas d'horodatage, on ne peut pas ordonner → on applique.
 * L'appelant ajoute le cas échéant le filtre tenant (`organismeId`) autour.
 */
export function wedofOrderedWhere(
  wedofId: string,
  incomingMajLe: Date | null,
): Record<string, unknown> {
  if (!incomingMajLe) return { wedofId };
  return {
    wedofId,
    OR: [{ wedofMajLe: null }, { wedofMajLe: { lte: incomingMajLe } }],
  };
}
