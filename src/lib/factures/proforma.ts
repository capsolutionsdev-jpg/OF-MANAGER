// src/lib/factures/proforma.ts
// Regroupement des PROFORMAS d'une session — PUR et testable (aucun I/O).
//   - Particulier (inscription sans entreprise)      → 1 proforma / candidat.
//   - Entreprise AVEC convention                     → 1 proforma / convention
//                                                       (1 ligne par candidat + total).
//   - Entreprise SANS convention                     → repli : 1 proforma / candidat, signalé.
// Réutilise calcMontants (arrondi au centime, EN 16931), montantDu (reste dû) et la
// mention d'exonération art. 261-4-4° du CGI. OFMANAGER pré-remplit, l'OF émet chez lui.
import { calcMontants, type LigneFacture } from "@/lib/factures/editeur";
import { montantDu } from "@/lib/comptabilite/montant-du";

const MENTION_EXONERATION = "TVA non applicable, art. 261-4-4° du CGI";

/** Une inscription normalisée (le mapping Prisma→ce type se fait dans la route). */
export type ProformaInscription = {
  inscriptionId: string;
  candidatNom: string;
  candidatEmail: string | null;
  /** Montant saisi sur l'inscription (null = retombe sur les factures émises). */
  montant: number | null;
  /** Somme TTC des factures déjà émises pour cette inscription. */
  facturesTtc: number;
  entrepriseId: string | null;
  entrepriseNom: string | null;
  entrepriseSiret: string | null;
  entrepriseEmail: string | null;
  conventionId: string | null;
  conventionRef: string | null;
};

export type ProformaLigne = { libelle: string; montantHT: number };

export type ProformaCible = {
  /** Clé stable pour l'URL de génération (?cible=…). */
  key: string;
  type: "particulier" | "entreprise";
  clientNom: string;
  clientSiret: string | null;
  clientEmail: string | null;
  conventionRef: string | null;
  /** Entreprise sans convention → proforma par candidat, à signaler à l'écran. */
  sansConvention: boolean;
  nbCandidats: number;
  lignes: ProformaLigne[];
  montantHT: number;
  tauxTva: number;
  montantTva: number;
  montantTTC: number;
  exonere: boolean;
  mentionTva: string;
};

function totaux(lignes: ProformaLigne[], assujettiTva: boolean, tauxTvaDefaut = 20) {
  const tauxTva = assujettiTva === false ? 0 : tauxTvaDefaut;
  const l: LigneFacture[] = lignes.map((x) => ({
    libelle: x.libelle,
    quantite: 1,
    prixUnitaire: x.montantHT,
    montantHT: x.montantHT,
  }));
  const { montantHT, montantTva, montantTTC } = calcMontants(l, tauxTva);
  const exonere = tauxTva === 0;
  return {
    tauxTva,
    montantHT,
    montantTva,
    montantTTC,
    exonere,
    mentionTva: exonere ? MENTION_EXONERATION : `TVA ${tauxTva} %`,
  };
}

export function buildSessionProformas(input: {
  /** Désignation de base (ex. « SSIAP 1 (du 12/03 au 16/03) »). */
  designation: string;
  assujettiTva: boolean;
  tauxTvaDefaut?: number;
  inscriptions: ProformaInscription[];
}): ProformaCible[] {
  const { designation, assujettiTva, tauxTvaDefaut } = input;
  const cibles: ProformaCible[] = [];
  // Accumulateur B2B par convention (préserve l'ordre d'apparition).
  const parConvention = new Map<
    string,
    { ref: string | null; nom: string; siret: string | null; email: string | null; lignes: ProformaLigne[]; nb: number }
  >();

  for (const i of input.inscriptions) {
    const montant = montantDu(i.montant, i.facturesTtc);

    if (!i.entrepriseId) {
      // Particulier → 1 proforma / candidat.
      const lignes: ProformaLigne[] = [{ libelle: designation, montantHT: montant }];
      cibles.push({
        key: `candidat:${i.inscriptionId}`,
        type: "particulier",
        clientNom: i.candidatNom,
        clientSiret: null,
        clientEmail: i.candidatEmail,
        conventionRef: null,
        sansConvention: false,
        nbCandidats: 1,
        lignes,
        ...totaux(lignes, assujettiTva, tauxTvaDefaut),
      });
    } else if (i.conventionId) {
      // Entreprise avec convention → regroupée.
      const acc =
        parConvention.get(i.conventionId) ?? {
          ref: i.conventionRef,
          nom: i.entrepriseNom ?? "Entreprise",
          siret: i.entrepriseSiret,
          email: i.entrepriseEmail,
          lignes: [],
          nb: 0,
        };
      acc.lignes.push({ libelle: `${designation} — ${i.candidatNom}`, montantHT: montant });
      acc.nb += 1;
      parConvention.set(i.conventionId, acc);
    } else {
      // Entreprise SANS convention → repli 1 proforma / candidat (signalé).
      const lignes: ProformaLigne[] = [{ libelle: `${designation} — ${i.candidatNom}`, montantHT: montant }];
      cibles.push({
        key: `candidat:${i.inscriptionId}`,
        type: "entreprise",
        clientNom: i.entrepriseNom ?? "Entreprise",
        clientSiret: i.entrepriseSiret,
        clientEmail: i.entrepriseEmail,
        conventionRef: null,
        sansConvention: true,
        nbCandidats: 1,
        lignes,
        ...totaux(lignes, assujettiTva, tauxTvaDefaut),
      });
    }
  }

  for (const [conventionId, acc] of parConvention) {
    cibles.push({
      key: `convention:${conventionId}`,
      type: "entreprise",
      clientNom: acc.nom,
      clientSiret: acc.siret,
      clientEmail: acc.email,
      conventionRef: acc.ref,
      sansConvention: false,
      nbCandidats: acc.nb,
      lignes: acc.lignes,
      ...totaux(acc.lignes, assujettiTva, tauxTvaDefaut),
    });
  }

  return cibles;
}
