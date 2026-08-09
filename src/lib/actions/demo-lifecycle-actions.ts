"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_TTL_HOURS } from "@/lib/demo/lifecycle";

const HARD_TTL_DAYS = Number(process.env.DEMO_HARD_TTL_DAYS ?? 7);

/**
 * Prolonge la démo de l'organisme courant : ré-arme le compteur (+48 h) et
 * repousse le filet dur (+7 j). Réservé à un utilisateur d'un tenant `isDemo`.
 */
export async function extendDemo(): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  const orgId = session?.user?.organismeId;
  if (!orgId) return { ok: false, error: "Session invalide." };

  const org = await prisma.organisme.findUnique({
    where: { id: orgId },
    select: { isDemo: true },
  });
  if (!org?.isDemo) return { ok: false, error: "Cet espace n'est pas une démonstration." };

  const now = Date.now();
  await prisma.organisme.update({
    where: { id: orgId },
    data: {
      demoExpiresAt: new Date(now + DEMO_TTL_HOURS * 3_600_000),
      demoHardExpiresAt: new Date(now + HARD_TTL_DAYS * 86_400_000),
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Variante compatible `<form action>` (ignore le FormData, renvoie void). */
export async function extendDemoAction(): Promise<void> {
  await extendDemo();
}
