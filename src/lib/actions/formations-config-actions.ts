"use server";

import { prisma } from "@/lib/prisma";
import { getAllFormationSlugs, type FormationSlug } from "@/lib/formations-catalog";

export async function updateOrganismeFormations(
  organismeId: string,
  selectedSlugs: FormationSlug[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Validation : vérifier que tous les slugs sont valides
    const validSlugs = new Set(getAllFormationSlugs());
    for (const slug of selectedSlugs) {
      if (!validSlugs.has(slug)) {
        return { ok: false, error: `Slug de formation invalide : ${slug}` };
      }
    }

    // Mettre à jour l'organisme
    await prisma.organisme.update({
      where: { id: organismeId },
      data: {
        configurationsFormations: selectedSlugs,
      },
    });

    return { ok: true };
  } catch (error) {
    console.error("Erreur mise à jour formations :", error);
    return { ok: false, error: "Impossible de mettre à jour les formations." };
  }
}
