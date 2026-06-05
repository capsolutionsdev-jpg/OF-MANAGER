"use server";

import { revalidatePath } from "next/cache";
import { CrmStage, InteractionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

type Res = { ok: boolean; error?: string };

/** Déplace un prospect dans le pipeline commercial (Kanban). */
export async function setCrmStage(
  candidatId: string,
  stage: CrmStage,
): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  await prisma.candidat.update({
    where: { id: candidatId },
    data: { crmStage: stage },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: `CRM_STAGE_${stage}`,
      entityType: "Candidat",
      entityId: candidatId,
    },
  });
  revalidatePath("/crm");
  revalidatePath("/crm/pipeline");
  revalidatePath(`/candidats/${candidatId}`);
  return { ok: true };
}

/** Affecte (ou retire) un commercial à un prospect. */
export async function assignCandidat(
  candidatId: string,
  userId: string | null,
): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  await prisma.candidat.update({
    where: { id: candidatId },
    data: { assignedToId: userId && userId.trim() !== "" ? userId : null },
  });
  revalidatePath("/crm");
  revalidatePath("/crm/pipeline");
  revalidatePath(`/candidats/${candidatId}`);
  return { ok: true };
}

/** Programme (ou efface) la date de prochaine relance d'un prospect. */
export async function setRelance(
  candidatId: string,
  dateStr: string | null,
): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  await prisma.candidat.update({
    where: { id: candidatId },
    data: { relanceDate: dateStr ? new Date(dateStr) : null },
  });
  revalidatePath("/crm");
  revalidatePath(`/candidats/${candidatId}`);
  return { ok: true };
}

/** Met à jour les tags (segmentation) d'un prospect. */
export async function updateTags(
  candidatId: string,
  tags: string[],
): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const clean = Array.from(
    new Set(tags.map((t) => t.trim()).filter((t) => t !== "")),
  ).slice(0, 20);

  await prisma.candidat.update({
    where: { id: candidatId },
    data: { tags: clean },
  });
  revalidatePath("/crm");
  revalidatePath(`/candidats/${candidatId}`);
  return { ok: true };
}

/** Définit la valeur estimée de l'opportunité. */
export async function setValeurEstimee(
  candidatId: string,
  montant: string | null,
): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const n = montant ? Number(montant.replace(",", ".")) : null;
  await prisma.candidat.update({
    where: { id: candidatId },
    data: { valeurEstimee: n !== null && !Number.isNaN(n) ? n : null },
  });
  revalidatePath("/crm");
  revalidatePath(`/candidats/${candidatId}`);
  return { ok: true };
}

/** Ajoute une interaction (appel, e-mail, RDV, note) à la timeline du prospect. */
export async function addInteraction(
  candidatId: string,
  type: InteractionType,
  sujet: string,
  contenu: string,
): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  await prisma.candidatInteraction.create({
    data: {
      candidatId,
      type,
      sujet: sujet.trim() || null,
      contenu: contenu.trim() || null,
      userId: session.user.id,
    },
  });
  revalidatePath(`/candidats/${candidatId}`);
  return { ok: true };
}

/** Supprime une interaction de la timeline. */
export async function deleteInteraction(
  interactionId: string,
  candidatId: string,
): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  await prisma.candidatInteraction.delete({ where: { id: interactionId } });
  revalidatePath(`/candidats/${candidatId}`);
  return { ok: true };
}

/**
 * Journalise automatiquement un e-mail envoyé à un prospect dans sa timeline
 * (utilisé par les actions d'envoi : lien d'inscription, relance…).
 */
export async function logProspectEmail(
  candidatId: string,
  sujet: string,
): Promise<void> {
  try {
    await prisma.candidatInteraction.create({
      data: { candidatId, type: "EMAIL", sujet, contenu: null },
    });
  } catch {
    // best-effort : ne bloque jamais l'envoi
  }
}
