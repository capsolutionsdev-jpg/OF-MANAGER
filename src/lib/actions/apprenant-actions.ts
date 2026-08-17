"use server";

import { revalidatePath } from "next/cache";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { getTenantDb } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

type Res = { ok: boolean; error?: string };

// Rôles autorisés à provisionner des comptes / attribuer des cours e-learning.
// (Sans ce garde, un APPRENANT connecté pourrait cibler un autre élève de son
// organisme — provisionner/réinitialiser son compte ou lui attribuer des cours.)
const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

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
  if (!session?.user || !STAFF.includes(session.user.role as string))
    return { ok: false, error: "Non autorisé." };
  if (!password || password.length < 8)
    return { ok: false, error: "Mot de passe : 8 caractères minimum." };

  try {
    const candidat = await db.candidat.findUnique({
      where: { id: candidatId },
      select: { id: true, nom: true, prenom: true, email: true, organismeId: true },
    });
    if (!candidat) return { ok: false, error: "Candidat introuvable." };

    const email = (emailOverride?.trim() || candidat.email).toLowerCase();
    if (!email) return { ok: false, error: "Aucune adresse e-mail." };

    // Apprenant : on passe par le client BRUT (pas le client cloisonné). La garde
    // d'appartenance de l'`upsert` scopé rejette en effet les lignes Apprenant
    // héritées à `organismeId` NUL (créées avant le multi-tenant) → « Accès refusé »
    // → l'accès n'était plus créable. On récupère/crée la ligne et on rattache
    // l'organisme au passage.
    let apprenant = await prisma.apprenant.findUnique({
      where: { candidatId },
      select: { id: true, userId: true, organismeId: true },
    });
    if (!apprenant) {
      apprenant = await prisma.apprenant.create({
        data: { candidatId, organismeId: candidat.organismeId },
        select: { id: true, userId: true, organismeId: true },
      });
    } else if (!apprenant.organismeId && candidat.organismeId) {
      await prisma.apprenant.update({
        where: { id: apprenant.id },
        data: { organismeId: candidat.organismeId },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const name = `${candidat.prenom} ${candidat.nom}`.trim();

    // User = entité GLOBALE (e-mail unique, authentification cross-tenant) → on
    // utilise le client BRUT `prisma`, JAMAIS le client scopé : ce dernier filtre
    // par organisme et masquerait un utilisateur d'un autre organisme (ou à
    // organisme nul), ce qui provoquait une collision de contrainte unique au
    // `user.create` → exception non gérée → crash. Cf. lib/tenant.ts.
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (apprenant.userId) {
      // Compte déjà lié → réinitialise le mot de passe.
      await prisma.user.update({
        where: { id: apprenant.userId },
        data: { passwordHash, role: "APPRENANT", isActive: true },
      });
    } else if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash, role: "APPRENANT", isActive: true, name },
      });
      await prisma.apprenant.update({
        where: { id: apprenant.id },
        data: { userId: existingUser.id },
      });
    } else {
      const user = await prisma.user.create({
        data: { email, name, role: "APPRENANT", passwordHash, organismeId: candidat.organismeId },
      });
      await prisma.apprenant.update({
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
  } catch (e) {
    // Instrumentation : capture la cause EXACTE en base (le message est masqué en
    // prod). Diagnostic → AuditLog action="APPRENANT_ACCOUNT_ERROR" (entityId=msg).
    // Retourne une erreur propre au lieu de jeter → plus de crash de page.
    const msg = e instanceof Error ? e.message : String(e);
    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "APPRENANT_ACCOUNT_ERROR",
          entityType: "Apprenant",
          entityId: msg.slice(0, 480),
        },
      });
    } catch {
      /* le journal ne doit jamais masquer l'erreur d'origine */
    }
    console.error("[createApprenantAccount]", e);
    return {
      ok: false,
      error: "Création de l'accès impossible. Réessayez, ou contactez le support si le problème persiste.",
    };
  }
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
  const ip = clientIpFromHeaders(hdrs);

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
  if (password.length < 8) return { error: "Mot de passe : 8 caractères minimum." };

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
  if (!session?.user || !STAFF.includes(session.user.role as string))
    return { ok: false, error: "Non autorisé." };
  // Correctif audit P3 : vérifier que le cours ET l'apprenant relèvent du tenant
  // courant avant de lier (le cours via le client scopé ; l'apprenant via le
  // client brut pour tolérer les lignes legacy à organismeId nul).
  const cours = await db.cours.findUnique({ where: { id: coursId }, select: { id: true } });
  const appr = await prisma.apprenant.findUnique({
    where: { id: apprenantId },
    select: { organismeId: true },
  });
  if (!cours || !appr || (appr.organismeId && appr.organismeId !== session.user.organismeId)) {
    return { ok: false, error: "Apprenant ou cours introuvable." };
  }
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
  if (!session?.user || !STAFF.includes(session.user.role as string))
    return { ok: false, error: "Non autorisé." };
  await db.coursApprenant.deleteMany({ where: { coursId, apprenantId } });
  revalidatePath("/elearning/apprenants");
  return { ok: true };
}
