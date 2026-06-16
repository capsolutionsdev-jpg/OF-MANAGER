"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { SECTION_KEYS } from "@/lib/permissions";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Action réservée à l'administrateur.");
  }
  return session.user;
}

function lirePermissions(formData: FormData): string[] {
  return SECTION_KEYS.filter((k) => formData.get(`perm_${k}`) === "on");
}

export type AdminState = { ok?: boolean; error?: string };

/** Création d'un compte collaborateur (e-mail + mot de passe + sections). */
export async function createCollaborateur(
  _prev: AdminState | undefined,
  formData: FormData,
): Promise<AdminState> {
  const db = await getTenantDb();
  try {
    await requireAdmin();
  } catch {
    return { error: "Non autorisé." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "ASSISTANT");
  const role = roleRaw === "RESPONSABLE_FORMATION" ? Role.RESPONSABLE_FORMATION : Role.ASSISTANT;

  if (!name) return { error: "Le nom est requis." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail invalide." };
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return { error: "Un compte existe déjà avec cet e-mail." };

  await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      isActive: true,
      permissions: lirePermissions(formData),
    },
  });
  revalidatePath("/administration");
  return { ok: true };
}

/** Mise à jour du nom, du rôle et des sections autorisées d'un collaborateur. */
export async function updateCollaborateur(formData: FormData) {
  const db = await getTenantDb();
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const name = String(formData.get("name") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "ASSISTANT");
  await db.user.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      role: roleRaw === "RESPONSABLE_FORMATION" ? Role.RESPONSABLE_FORMATION : Role.ASSISTANT,
      permissions: lirePermissions(formData),
    },
  });
  revalidatePath("/administration");
}

/** Réinitialise le mot de passe d'un collaborateur. */
export async function resetCollaborateurPassword(formData: FormData) {
  const db = await getTenantDb();
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id || password.length < 8) return;
  await db.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/administration");
}

/** Active / désactive un collaborateur (sans le supprimer). */
export async function toggleCollaborateurActive(formData: FormData) {
  const db = await getTenantDb();
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id || id === me.id) return; // pas soi-même
  const u = await db.user.findUnique({ where: { id }, select: { isActive: true } });
  if (!u) return;
  await db.user.update({ where: { id }, data: { isActive: !u.isActive } });
  revalidatePath("/administration");
}

/** Supprime un compte collaborateur (jamais un ADMIN ni soi-même). */
export async function deleteCollaborateur(formData: FormData) {
  const db = await getTenantDb();
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id || id === me.id) return;
  const u = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!u || u.role === "ADMIN") return; // on ne supprime pas un admin via cette action
  await db.user.delete({ where: { id } });
  revalidatePath("/administration");
}
