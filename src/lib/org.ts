import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { orgConfig as defaultOrg } from "@/lib/org-config";

/**
 * Organisme (tenant) de l'utilisateur connecté. Mis en cache par requête.
 * NULL pour le SUPERADMIN (éditeur, hors organisme) ou hors session.
 */
export const getCurrentOrganisme = cache(async () => {
  const session = await auth();
  const id = session?.user?.organismeId;
  if (!id) return null;
  return prisma.organisme.findUnique({ where: { id } });
});

/**
 * Marque à afficher dans l'UI connectée (nom, logo, couleur), avec repli sur
 * les valeurs CAP par défaut tant qu'un OF n'a pas renseigné les siennes.
 */
export async function getBranding() {
  const org = await getCurrentOrganisme();
  return {
    nom: org?.nom ?? defaultOrg.name,
    logoUrl: org?.logoUrl ?? null, // null → logo statique par défaut
    faviconUrl: org?.faviconUrl ?? null,
    couleurPrimaire: org?.couleurPrimaire ?? "#2C53C0",
    couleurSecondaire: org?.couleurSecondaire ?? null,
    theme: org?.theme ?? null,
    design: org?.design ?? null,
  };
}
