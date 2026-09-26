"use server";

import { revalidatePath } from "next/cache";
import { QualiopiStatut } from "@prisma/client";
import { getTenantDb, requireTenant } from "@/lib/tenant";
import { auth } from "@/auth";
import { isNonStaffRole } from "@/lib/permissions";
import { INDICATEURS } from "@/lib/qualiopi-indicateurs";

export async function initialiserIndicateurs() {
  const session = await auth();
  // BFLA (OFM) : indicateurs Qualiopi réservés au personnel (conformité).
  if (!session?.user || isNonStaffRole(session.user.role)) return;
  // Indicateurs cloisonnés par organisme → unicité composite (organisme, numéro).
  const { organismeId, db } = await requireTenant();

  for (const ind of INDICATEURS) {
    await db.qualiopiIndicateur.upsert({
      where: { organismeId_numero: { organismeId, numero: ind.numero } },
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
  if (!session?.user || isNonStaffRole(session.user.role)) return { ok: false };

  const db = await getTenantDb();
  await db.qualiopiIndicateur.update({
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
