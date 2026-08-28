// Montant dû d'une inscription — règle UNIQUE partagée par le suivi comptable et
// la fiche paiements du candidat (A06-022) : le montant saisi sur l'inscription
// s'il existe, sinon la somme des factures TTC rattachées. Un montant de 0 € est
// un montant valide (formation offerte) et NE retombe PAS sur les factures.
export function montantDu(inscriptionMontant: number | null, facturesTtc: number): number {
  return inscriptionMontant != null ? inscriptionMontant : facturesTtc;
}
