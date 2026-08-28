import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { orgConfig } from "@/lib/org-config";

/** Identité d'un organisme telle qu'utilisée dans les documents et e-mails. */
export type OrgIdentity = {
  /** Id de l'organisme (pour construire l'URL du logo en e-mail). null = repli. */
  id: string | null;
  name: string;
  representant: string;
  representantQualite: string;
  siret: string;
  nda: string;
  adresse: string;
  email: string;
  telephone: string;
  ville: string;
  certificateur: string;
  qualiopi: string;
  logoUrl: string | null;
  cachetUrl: string | null;
  signatureUrl: string | null;
  referentHandicapNom: string | null;
  referentHandicapContact: string | null;
  documentsConfig: unknown;
};

/** Repli : valeurs historiques CAP (lib/org-config.ts). */
export const DEFAULT_ORG_IDENTITY: OrgIdentity = {
  id: null,
  name: orgConfig.name,
  representant: orgConfig.representant,
  representantQualite: "Gérant",
  siret: orgConfig.siret,
  nda: orgConfig.nda,
  adresse: orgConfig.adresse,
  email: orgConfig.email,
  telephone: orgConfig.telephone,
  ville: orgConfig.ville,
  certificateur: orgConfig.certificateur,
  qualiopi: orgConfig.qualiopi,
  logoUrl: null,
  cachetUrl: null,
  signatureUrl: null,
  referentHandicapNom: null,
  referentHandicapContact: null,
  documentsConfig: null,
};

/**
 * Identité de l'organisme à partir de son id (porté par chaque record :
 * inscription.organismeId, session.organismeId…). Repli sur les valeurs par
 * défaut si introuvable. Utilisable côté authentifié comme public/cron.
 */
export const orgConfigFor = cache(async (
  organismeId?: string | null,
): Promise<OrgIdentity> => {
  if (!organismeId) return DEFAULT_ORG_IDENTITY;
  const o = await prisma.organisme.findUnique({ where: { id: organismeId } });
  if (!o) return DEFAULT_ORG_IDENTITY;
  const adresse = [o.adresse, [o.codePostal, o.ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return {
    id: o.id,
    name: o.nom || DEFAULT_ORG_IDENTITY.name,
    representant: o.representant || DEFAULT_ORG_IDENTITY.representant,
    representantQualite: o.representantQualite || DEFAULT_ORG_IDENTITY.representantQualite,
    siret: o.siret || DEFAULT_ORG_IDENTITY.siret,
    nda: o.nda || DEFAULT_ORG_IDENTITY.nda,
    adresse: adresse || DEFAULT_ORG_IDENTITY.adresse,
    email: o.email || DEFAULT_ORG_IDENTITY.email,
    telephone: o.telephone || DEFAULT_ORG_IDENTITY.telephone,
    ville: o.ville || DEFAULT_ORG_IDENTITY.ville,
    certificateur: o.certificateur || DEFAULT_ORG_IDENTITY.certificateur,
    qualiopi: o.qualiopiNumero || DEFAULT_ORG_IDENTITY.qualiopi,
    logoUrl: o.logoUrl,
    cachetUrl: o.cachetUrl,
    signatureUrl: o.signatureUrl,
    referentHandicapNom: o.referentHandicapNom,
    referentHandicapContact: o.referentHandicapContact,
    documentsConfig: o.documentsConfig,
  };
});
