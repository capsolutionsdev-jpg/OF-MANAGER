"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mergeAgrements, type AgrementsConfig } from "@/lib/agrements";

/**
 * Enregistre les agréments et autorisations de l'organisme (un par famille de
 * formations). Réservé aux responsables de l'organisme courant — sans passer par
 * la console SUPERADMIN. Les champs vides sont acceptés : un agrément peut ne pas
 * encore avoir été délivré.
 */

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION"];

export async function updateAgrements(
  input: AgrementsConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId) {
    return { ok: false, error: "Non autorisé." };
  }

  const org = await prisma.organisme.findUnique({
    where: { id: organismeId },
    select: { documentsConfig: true },
  });
  if (!org) return { ok: false, error: "Organisme introuvable." };

  const documentsConfig = mergeAgrements(org.documentsConfig, input);

  await prisma.organisme.update({
    where: { id: organismeId },
    data: { documentsConfig: documentsConfig as Prisma.InputJsonValue },
  });

  await prisma.auditLog.create({
    data: {
      organismeId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "OrganismeAgrements",
      entityId: organismeId,
    },
  });

  revalidatePath("/diplomes/agrements");
  return { ok: true };
}
