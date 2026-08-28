import { calcMontants, type LigneFacture } from "@/lib/factures/editeur";

// Facture PRÉ-FORMATÉE, exportable vers le logiciel de facturation de l'OF
// (A06-003). OFMANAGER ne devient pas la facture de référence : il pré-remplit
// les lignes et les totaux (HT/TVA/TTC, exonération) depuis les données de
// formation, pour éviter la ressaisie. Pur → réutilise calcMontants (arrondi au
// centime, méthode EN 16931) et la mention d'exonération art. 261-4-4° du CGI.

export type PreFactureInput = {
  clientNom: string;
  clientSiret?: string | null;
  clientEmail?: string | null;
  designation: string;
  montantHT: number;
  /** L'organisme facture-t-il avec TVA ? (Organisme.assujettiTva) */
  assujettiTva: boolean;
  /** Taux appliqué si assujetti (défaut 20 %). */
  tauxTvaDefaut?: number;
};

export type PreFacture = {
  clientNom: string;
  clientSiret: string | null;
  clientEmail: string | null;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  montantHT: number;
  tauxTva: number;
  montantTva: number;
  montantTTC: number;
  exonere: boolean;
  mentionTva: string;
};

const MENTION_EXONERATION = "TVA non applicable, art. 261-4-4° du CGI";

export function buildPreFacture(input: PreFactureInput): PreFacture {
  const tauxTva = input.assujettiTva === false ? 0 : input.tauxTvaDefaut ?? 20;
  const lignes: LigneFacture[] = [
    { libelle: input.designation, quantite: 1, prixUnitaire: input.montantHT, montantHT: input.montantHT },
  ];
  const { montantHT, montantTva, montantTTC } = calcMontants(lignes, tauxTva);
  const exonere = tauxTva === 0;
  return {
    clientNom: input.clientNom,
    clientSiret: input.clientSiret ?? null,
    clientEmail: input.clientEmail ?? null,
    designation: input.designation,
    quantite: 1,
    prixUnitaire: input.montantHT,
    montantHT,
    tauxTva,
    montantTva,
    montantTTC,
    exonere,
    mentionTva: exonere ? MENTION_EXONERATION : `TVA ${tauxTva} %`,
  };
}
