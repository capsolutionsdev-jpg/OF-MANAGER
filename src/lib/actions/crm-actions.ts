"use server";

import { revalidatePath } from "next/cache";
import { CrmStage, InteractionType } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { requireSection } from "@/lib/section-guard";

type Res = { ok: boolean; error?: string };

/** Déplace un prospect dans le pipeline commercial (Kanban). */
export async function setCrmStage(
  candidatId: string,
  stage: CrmStage,
): Promise<Res> {
  const session = await requireSection("crm");
  const db = await getTenantDb();

  await db.candidat.update({
    where: { id: candidatId },
    data: { crmStage: stage },
  });
  await db.auditLog.create({
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
  await requireSection("crm");
  const db = await getTenantDb();

  // Valide que l'utilisateur affecté appartient bien à l'organisme (db scopé →
  // findFirst renvoie null si le userId vient d'un autre tenant) : empêche
  // d'affecter un prospect à un utilisateur d'un autre organisme.
  const cible = userId && userId.trim() !== "" ? userId : null;
  if (cible) {
    const u = await db.user.findFirst({ where: { id: cible }, select: { id: true } });
    if (!u) return { ok: false, error: "Utilisateur invalide." };
  }
  await db.candidat.update({
    where: { id: candidatId },
    data: { assignedToId: cible },
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
  await requireSection("crm");
  const db = await getTenantDb();

  await db.candidat.update({
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
  await requireSection("crm");
  const db = await getTenantDb();

  const clean = Array.from(
    new Set(tags.map((t) => t.trim()).filter((t) => t !== "")),
  ).slice(0, 20);

  await db.candidat.update({
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
  await requireSection("crm");
  const db = await getTenantDb();

  const n = montant ? Number(montant.replace(",", ".")) : null;
  await db.candidat.update({
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
  const session = await requireSection("crm");
  const db = await getTenantDb();

  await db.candidatInteraction.create({
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
  await requireSection("crm");
  const db = await getTenantDb();

  await db.candidatInteraction.delete({ where: { id: interactionId } });
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
  const db = await getTenantDb();
  try {
    await db.candidatInteraction.create({
      data: { candidatId, type: "EMAIL", sujet, contenu: null },
    });
  } catch {
    // best-effort : ne bloque jamais l'envoi
  }
}
