"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { provisionnerFormations } from "@/lib/formations/provision";

export type FormationsConfigResult = {
  ok: boolean;
  error?: string;
  /** Formations créées dans le catalogue du tenant lors de cette sauvegarde. */
  creees?: string[];
  /** Identifiants ignorés (configuration héritée d'une ancienne version). */
  ignores?: string[];
};

/**
 * Console dev (SUPERADMIN) : enregistre les formations qu'un organisme utilise
 * et provisionne celles qui manquent dans son catalogue. La logique (migration
 * des identifiants + création depuis les modèles + enregistrement de la config)
 * vit dans `lib/formations/provision` — partagée avec le script de maintenance.
 */
export async function updateOrganismeFormations(
  organismeId: string,
  selectedSlugs: string[],
): Promise<FormationsConfigResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non connecté." };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true, activeSessionId: true },
  });
  if (!user?.isActive || user.role !== "SUPERADMIN") {
    return { ok: false, error: "Réservé au compte développeur." };
  }
  // Révocation de session (audit SEC-014 / A05-017) : refuse un token SUPERADMIN
  // supplanté par une connexion plus récente (le contrôle in-line l'omettait).
  const sid = (session.user as { sid?: string | null }).sid ?? null;
  if (sid && user.activeSessionId && user.activeSessionId !== sid) {
    return { ok: false, error: "Session expirée." };
  }

  const org = await prisma.organisme.findUnique({
    where: { id: organismeId },
    select: { id: true },
  });
  if (!org) return { ok: false, error: "Organisme introuvable." };

  const { creees, ignores } = await provisionnerFormations(
    prisma,
    organismeId,
    selectedSlugs,
  );

  revalidatePath(`/console/${organismeId}`);
  return { ok: true, creees, ignores };
}
