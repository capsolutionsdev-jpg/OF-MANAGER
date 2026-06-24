"use server";

import { revalidatePath } from "next/cache";
import { CivicMention } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

/**
 * Crée ou met à jour le tarif de la prépa civique en ligne pour une mention.
 * Prix saisi en euros (converti en centimes), remise en % (promo simple).
 * Réservé au personnel administratif du tenant courant.
 */
export async function setCivicTarif(formData: FormData) {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId) {
    throw new Error("Non autorisé.");
  }

  const mention = String(formData.get("mention") ?? "") as CivicMention;
  if (!Object.values(CivicMention).includes(mention)) {
    throw new Error("Mention invalide.");
  }
  const prixEuros = Math.max(0, Number(formData.get("prix") ?? 0));
  const remise = Math.min(Math.max(Number(formData.get("remise") ?? 0), 0), 100);
  const actif = formData.get("actif") === "on";
  const prixCents = Math.round(prixEuros * 100);

  await prisma.civicTarif.upsert({
    where: { organismeId_mention: { organismeId, mention } },
    create: { organismeId, mention, prixCents, remisePct: remise, actif },
    update: { prixCents, remisePct: remise, actif },
  });

  revalidatePath("/examen-civique");
}
