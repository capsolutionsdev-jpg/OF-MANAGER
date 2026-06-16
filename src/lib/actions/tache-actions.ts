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

  await db.tache.create({
    data: {
      titre,
      description,
      dueDate: dueRaw ? new Date(dueRaw) : null,
      candidatId,
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
  const done = String(formData.get("done")) === "true";
  await db.tache.update({ where: { id }, data: { done: !done } });
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
