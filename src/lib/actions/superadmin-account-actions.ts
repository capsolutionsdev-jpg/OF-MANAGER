"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { isPasswordPwned } from "@/lib/security/password";

export type AccountState = { ok?: boolean; error?: string };

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Met à jour le profil (nom + e-mail) du compte éditeur connecté. */
export async function updateSuperadminProfile(
  _prev: AccountState | undefined,
  formData: FormData,
): Promise<AccountState> {
  const session = await requireSuperAdmin();
  const id = session!.user!.id as string;

  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  if (!name) return { error: "Le nom est requis." };
  if (!EMAIL_RE.test(email)) return { error: "E-mail invalide." };

  const taken = await prisma.user.findFirst({ where: { email, NOT: { id } }, select: { id: true } });
  if (taken) return { error: "Cet e-mail est déjà utilisé par un autre compte." };

  await prisma.user.update({ where: { id }, data: { name, email } });
  revalidatePath("/console/compte");
  return { ok: true };
}

/** Change le mot de passe du compte éditeur connecté (vérifie l'actuel). */
export async function changeSuperadminPassword(
  _prev: AccountState | undefined,
  formData: FormData,
): Promise<AccountState> {
  const session = await requireSuperAdmin();
  const id = session!.user!.id as string;

  const current = str(formData, "current");
  const next = str(formData, "next");
  const confirm = str(formData, "confirm");
  if (next.length < 8) return { error: "Le nouveau mot de passe doit faire au moins 8 caractères." };
  if (next !== confirm) return { error: "La confirmation ne correspond pas." };

  const user = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
  if (!user) return { error: "Compte introuvable." };
  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid) return { error: "Mot de passe actuel incorrect." };
  if (await isPasswordPwned(next))
    return { error: "Ce mot de passe figure dans une fuite de données connue — choisissez-en un autre." };

  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  await prisma.auditLog.create({
    data: { userId: id, action: "UPDATE", entityType: "User", entityId: id, changesJson: { password: "changed" } },
  });
  return { ok: true };
}

/** Crée un nouveau compte éditeur (SUPERADMIN). */
export async function createSuperadmin(
  _prev: AccountState | undefined,
  formData: FormData,
): Promise<AccountState> {
  const actor = await requireSuperAdmin();

  const name = str(formData, "name") || "Éditeur";
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  if (!EMAIL_RE.test(email)) return { error: "E-mail invalide." };
  if (password.length < 8) return { error: "Mot de passe : 8 caractères minimum." };

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { error: "Un compte existe déjà avec cet e-mail." };
  if (await isPasswordPwned(password))
    return { error: "Ce mot de passe figure dans une fuite de données connue — choisissez-en un autre." };

  const created = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: Role.SUPERADMIN,
      isActive: true,
      organismeId: null,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: actor!.user!.id as string,
      action: "CREATE",
      entityType: "User",
      entityId: created.id,
      changesJson: { role: "SUPERADMIN" },
    },
  });
  revalidatePath("/console/compte");
  return { ok: true };
}

/** Active / désactive un autre compte éditeur (jamais le sien). */
export async function toggleSuperadminActive(id: string): Promise<void> {
  const session = await requireSuperAdmin();
  if (id === session!.user!.id) return; // on ne se désactive pas soi-même

  const u = await prisma.user.findFirst({ where: { id, role: Role.SUPERADMIN }, select: { isActive: true } });
  if (!u) return;
  await prisma.user.update({ where: { id }, data: { isActive: !u.isActive } });
  await prisma.auditLog.create({
    data: {
      userId: session!.user!.id as string,
      action: "UPDATE",
      entityType: "User",
      entityId: id,
      changesJson: { isActive: !u.isActive },
    },
  });
  revalidatePath("/console/compte");
}
