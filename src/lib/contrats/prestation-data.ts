import "server-only";
import type { ContratPrestation, Organisme } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLANS, type FormuleKey } from "@/lib/plans";
import type {
  PrestataireIdentite,
  ClientIdentite,
  ContratData,
  EngagementType,
} from "@/lib/contrats/prestation";

/**
 * Identité du PRESTATAIRE (l'éditeur) = l'organisme désigné par
 * `VITRINE_ORGANISME_ID` (CAP Compétences, qui édite OF Manager). Repli générique
 * si l'env n'est pas posée. cf. [[projet_vitrine_console_integration]].
 */
export async function getPrestataire(): Promise<PrestataireIdentite> {
  const id = process.env.VITRINE_ORGANISME_ID;
  const org = id
    ? await prisma.organisme.findUnique({
        where: { id },
        select: {
          nom: true, raisonSociale: true, siret: true, adresse: true,
          codePostal: true, ville: true, representant: true, email: true, cachetUrl: true,
        },
      })
    : null;
  if (!org) return { nom: "OF Manager" };
  return {
    nom: org.nom,
    raisonSociale: org.raisonSociale,
    siret: org.siret,
    adresse: [org.adresse, org.codePostal, org.ville].filter(Boolean).join(", ") || null,
    representant: org.representant,
    email: org.email,
    cachetUrl: org.cachetUrl,
  };
}

/** Identité du CLIENT à partir de son organisme. */
export function clientFromOrg(org: Organisme): ClientIdentite {
  return {
    nom: org.nom,
    raisonSociale: org.raisonSociale,
    siret: org.siret,
    adresse: [org.adresse, org.codePostal, org.ville].filter(Boolean).join(", ") || null,
    representant: org.representant,
    email: org.email,
  };
}

/** Données d'affichage/PDF à partir d'un ContratPrestation. */
export function contratDataFrom(c: ContratPrestation): ContratData {
  return {
    reference: c.reference,
    formuleNom: PLANS[c.formule as FormuleKey]?.name ?? c.formule,
    montantMensuel: Number(c.montantMensuel),
    remisePct: c.remisePct,
    engagement: c.engagement as EngagementType,
    options: c.options,
    dateDebut: c.dateDebut,
    signataireNom: c.signataireNom,
    signatureUrl: c.signatureUrl,
    signedAt: c.signedAt,
  };
}
