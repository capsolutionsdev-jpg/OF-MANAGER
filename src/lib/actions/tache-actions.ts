"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";

/** Crée une tâche / rappel (optionnellement rattachée à un candidat). */
export async function createTache(formData: FormData) {
  const session = await requireSection("taches");
  const db = await getTenantDb();

  const titre = String(formData.get("titre") ?? "").trim();
  if (!titre) return;
  const description = String(formData.get("description") ?? "").trim() || null;
  const dueRaw = String(formData.get("dueDate") ?? "").trim();
  const candidatId = String(formData.get("candidatId") ?? "").trim() || null;

  // Date validée (une chaîne invalide → null, plutôt qu'une Invalid Date en base).
  const due = dueRaw ? new Date(dueRaw) : null;
  const dueDate = due && !Number.isNaN(due.getTime()) ? due : null;

  // candidatId validé (client scopé → null si l'id vient d'un autre organisme).
  let validCandidatId: string | null = null;
  if (candidatId) {
    const c = await db.candidat.findFirst({ where: { id: candidatId }, select: { id: true } });
    validCandidatId = c?.id ?? null;
  }

  await db.tache.create({
    data: {
      titre,
      description,
      dueDate,
      candidatId: validCandidatId,
      createdById: session?.user?.id ?? null,
    },
  });
  revalidatePath("/taches");
}

/** Coche / décoche une tâche (fait / à faire). */
export async function toggleTache(formData: FormData) {
  await requireSection("taches");
  const db = await getTenantDb();
  const id = String(formData.get("id"));
  // État recalculé depuis la BASE (source de vérité), pas depuis la valeur client
  // (qui peut être périmée → bascule incohérente).
  const t = await db.tache.findUnique({ where: { id }, select: { done: true } });
  if (!t) return;
  await db.tache.update({ where: { id }, data: { done: !t.done } });
  revalidatePath("/taches");
}

/** Supprime une tâche. */
export async function deleteTache(formData: FormData) {
  await requireSection("taches");
  const db = await getTenantDb();
  const id = String(formData.get("id"));
  await db.tache.delete({ where: { id } });
  revalidatePath("/taches");
}
