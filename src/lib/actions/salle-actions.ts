"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";

export type SalleState = { ok?: boolean; error?: string };

const clean = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

/** Crée une salle pour l'organisme courant. */
export async function createSalle(
  _prev: SalleState | undefined,
  formData: FormData,
): Promise<SalleState> {
  await requireSection("salles");
  const db = await getTenantDb();

  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { error: "Le nom de la salle est requis." };
  const capRaw = String(formData.get("capacite") ?? "").trim();
  const capacite = capRaw ? parseInt(capRaw, 10) : null;

  await db.salle.create({
    data: {
      nom,
      capacite: capacite != null && !Number.isNaN(capacite) ? capacite : null,
      lieu: clean(formData.get("lieu")),
      equipements: clean(formData.get("equipements")),
      couleur: clean(formData.get("couleur")) ?? "#1A5FD4",
    },
  });

  revalidatePath("/salles");
  revalidatePath("/planning");
  return { ok: true };
}

/** Active / désactive une salle. */
export async function toggleSalleActive(formData: FormData) {
  await requireSection("salles");
  const db = await getTenantDb();
  const id = String(formData.get("id"));
  const s = await db.salle.findUnique({ where: { id }, select: { actif: true } });
  if (s) await db.salle.update({ where: { id }, data: { actif: !s.actif } });
  revalidatePath("/salles");
}
