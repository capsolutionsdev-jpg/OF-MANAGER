import "server-only";
import type { FactureEditeur, Organisme } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  PartieFacture, FactureData, LigneFacture, FactureStatut, Categorie,
} from "@/lib/factures/editeur";

/** Émetteur des factures = l'organisme éditeur (VITRINE_ORGANISME_ID = CAP). */
export async function getEmetteur(): Promise<PartieFacture> {
  const id = process.env.VITRINE_ORGANISME_ID;
  const org = id
    ? await prisma.organisme.findUnique({
        where: { id },
        select: {
          nom: true, raisonSociale: true, siret: true, numeroTva: true, nda: true,
          adresse: true, codePostal: true, ville: true, email: true, representant: true,
        },
      })
    : null;
  if (!org) return { nom: "OF Manager" };
  return {
    nom: org.nom,
    raisonSociale: org.raisonSociale,
    siret: org.siret,
    tva: org.numeroTva,
    nda: org.nda,
    adresse: org.adresse,
    codePostal: org.codePostal,
    ville: org.ville,
    pays: "France",
    email: org.email,
    representant: org.representant,
  };
}

/** Partie « client » à partir de son organisme. */
export function partieFromOrg(org: Organisme): PartieFacture {
  return {
    nom: org.nom,
    raisonSociale: org.raisonSociale,
    siret: org.siret,
    tva: org.numeroTva,
    adresse: org.adresse,
    codePostal: org.codePostal,
    ville: org.ville,
    pays: "France",
    email: org.email,
    representant: org.representant,
  };
}

/** Données d'affichage/PDF/XML à partir d'une FactureEditeur. */
export function factureDataFrom(f: FactureEditeur): FactureData {
  return {
    numero: f.numero ?? "(brouillon)",
    statut: f.statut as FactureStatut,
    categorie: f.categorie as Categorie,
    periodeDebut: f.periodeDebut,
    periodeFin: f.periodeFin,
    dateEmission: f.dateEmission,
    dateEcheance: f.dateEcheance,
    montantHT: Number(f.montantHT),
    tauxTva: Number(f.tauxTva),
    montantTva: Number(f.montantTva),
    montantTTC: Number(f.montantTTC),
    lignes: (f.lignes as unknown as LigneFacture[]) ?? [],
    clientSiren: f.clientSiren,
    adresseLivraison: f.adresseLivraison,
    optionTvaDebits: f.optionTvaDebits,
    modePaiement: f.modePaiement,
  };
}
