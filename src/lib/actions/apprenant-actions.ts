"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { getTenantDb } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
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

/** Apprenant connecté (via son compte utilisateur), sinon null. */
async function currentApprenant() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "APPRENANT") return null;
  return prisma.apprenant.findUnique({
    where: { userId: session.user.id },
    select: { id: true, candidatId: true },
  });
}

/**
 * Signature d'une feuille d'émargement DEPUIS l'espace apprenant connecté.
 * Vérifie que la ligne appartient bien au candidat de l'apprenant connecté
 * (impossible de signer l'émargement d'un autre stagiaire).
 */
export async function signMyEmargement(
  emargementId: string,
  signatureDataUrl?: string,
): Promise<Res> {
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const appr = await currentApprenant();
  if (!appr) return { ok: false, error: "Non autorisé." };

  const row = await prisma.emargementSignature.findFirst({
    where: { id: emargementId, candidatId: appr.candidatId },
    select: { id: true, signedAt: true },
  });
  if (!row) return { ok: false, error: "Émargement introuvable." };
  if (row.signedAt) return { ok: true };

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;

  await prisma.emargementSignature.update({
    where: { id: row.id },
    data: { signedAt: new Date(), signatureIp: ip, signatureDataUrl },
  });
  revalidatePath("/mes-emargements");
  return { ok: true };
}

export type AccountState = { ok?: boolean; error?: string; id?: string };
const STAFF_ADMIN = ["ADMIN", "RESPONSABLE_FORMATION"];
const cleanStr = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

/**
 * Crée un CANDIDAT + son compte « espace apprenant » en une fois
 * (depuis Administration → Créer un compte → Candidat).
 */
export async function createCandidatWithAccount(
  _prev: AccountState | undefined,
  formData: FormData,
): Promise<AccountState> {
  const session = await auth();
  if (!session?.user || !STAFF_ADMIN.includes(session.user.role as string))
    return { error: "Non autorisé." };

  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!prenom || !nom) return { error: "Nom et prénom requis." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail invalide." };
  if (password.length < 6) return { error: "Mot de passe : 6 caractères minimum." };

  const db = await getTenantDb();
  const candidat = await db.candidat.create({
    data: { prenom, nom, email, telephone: cleanStr(formData.get("telephone")) },
    select: { id: true },
  });

  const r = await createApprenantAccount(candidat.id, password);
  if (!r.ok) return { error: r.error };

  revalidatePath("/candidats");
  return { ok: true, id: candidat.id };
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
