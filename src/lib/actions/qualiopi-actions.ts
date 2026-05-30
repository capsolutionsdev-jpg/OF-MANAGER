"use server";

import { revalidatePath } from "next/cache";
import { QualiopiStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { INDICATEURS } from "@/lib/qualiopi-indicateurs";

export async function initialiserIndicateurs() {
  const session = await auth();
  if (!session?.user) return;

  for (const ind of INDICATEURS) {
    await prisma.qualiopiIndicateur.upsert({
      where: { numero: ind.numero },
      update: { libelle: ind.libelle },
      create: {
        numero: ind.numero,
        libelle: ind.libelle,
        statut: QualiopiStatut.EN_COURS,
      },
    });
  }
  revalidatePath("/qualiopi");
}

export async function updateIndicateur(
  id: string,
  data: { statut?: QualiopiStatut; commentaire?: string },
): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };

  await prisma.qualiopiIndicateur.update({
    where: { id },
    data: {
      ...(data.statut ? { statut: data.statut } : {}),
      ...(data.commentaire !== undefined ? { commentaire: data.commentaire } : {}),
      responsableId: session.user.id,
      dateMaj: new Date(),
    },
  });
  revalidatePath("/qualiopi");
  return { ok: true };
}
