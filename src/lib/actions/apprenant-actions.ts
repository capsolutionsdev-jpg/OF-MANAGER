"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";

type Res = { ok: boolean; error?: string };

/**
 * Crée (ou réinitialise) le compte e-learning d'un candidat : garantit son
 * dossier Apprenant, crée un utilisateur APPRENANT avec mot de passe et le lie.
 */
export async function createApprenantAccount(
  candidatId: string,
  password: string,
  emailOverride?: string,
): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  if (!password || password.length < 6)
    return { ok: false, error: "Mot de passe : 6 caractères minimum." };

  const candidat = await db.candidat.findUnique({
    where: { id: candidatId },
    select: { id: true, nom: true, prenom: true, email: true },
  });
  if (!candidat) return { ok: false, error: "Candidat introuvable." };

  const email = (emailOverride?.trim() || candidat.email).toLowerCase();
  if (!email) return { ok: false, error: "Aucune adresse e-mail." };

  const apprenant = await db.apprenant.upsert({
    where: { candidatId },
    update: {},
    create: { candidatId },
    select: { id: true, userId: true },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const name = `${candidat.prenom} ${candidat.nom}`.trim();

  // Un utilisateur avec cet e-mail existe-t-il déjà ?
  const existingUser = await db.user.findUnique({ where: { email } });

  if (apprenant.userId) {
    // Compte déjà lié → réinitialise le mot de passe
    await db.user.update({
      where: { id: apprenant.userId },
      data: { passwordHash, role: "APPRENANT", isActive: true },
    });
  } else if (existingUser) {
    await db.user.update({
      where: { id: existingUser.id },
      data: { passwordHash, role: "APPRENANT", isActive: true, name },
    });
    await db.apprenant.update({
      where: { id: apprenant.id },
      data: { userId: existingUser.id },
    });
  } else {
    const user = await db.user.create({
      data: { email, name, role: "APPRENANT", passwordHash },
    });
    await db.apprenant.update({
      where: { id: apprenant.id },
      data: { userId: user.id },
    });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "APPRENANT_ACCOUNT",
      entityType: "Apprenant",
      entityId: apprenant.id,
    },
  });

  revalidatePath("/elearning/apprenants");
  return { ok: true };
}

/** Attribue un cours à un apprenant. */
export async function assignCours(
  apprenantId: string,
  coursId: string,
): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  await db.coursApprenant.upsert({
    where: { coursId_apprenantId: { coursId, apprenantId } },
    update: {},
    create: { coursId, apprenantId },
  });
  revalidatePath("/elearning/apprenants");
  return { ok: true };
}

/** Retire l'attribution d'un cours à un apprenant. */
export async function unassignCours(
  apprenantId: string,
  coursId: string,
): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  await db.coursApprenant.deleteMany({ where: { coursId, apprenantId } });
  revalidatePath("/elearning/apprenants");
  return { ok: true };
}
