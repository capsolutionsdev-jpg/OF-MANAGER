"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

// Gestion transverse des comptes depuis /administration/comptes (ADMIN de l'OF) :
// SUSPENDRE / RÉACTIVER (désactive le compte de connexion) et SUPPRIMER, pour les
// collaborateurs, formateurs et candidats. Tenant-scopé (getTenantDb) + garde ADMIN
// revalidée en base. La suppression est protégée : si des relations l'empêchent
// (sessions, inscriptions…), elle échoue proprement avec un message clair.

export type CompteType = "collaborateur" | "formateur" | "candidat";
export type CompteActionState = { ok?: boolean; error?: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Non autorisé.");
  const db = await getTenantDb();
  const fresh = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });
  if (!fresh || !fresh.isActive || fresh.role !== "ADMIN") throw new Error("Non autorisé.");
  return session.user;
}

/** Résout l'id du compte de CONNEXION (User) selon le type. null = pas de compte d'accès. */
async function loginUserId(
  db: Awaited<ReturnType<typeof getTenantDb>>,
  type: CompteType,
  id: string,
): Promise<{ userId: string | null; found: boolean }> {
  if (type === "collaborateur") {
    const u = await db.user.findUnique({ where: { id }, select: { id: true } });
    return { userId: u?.id ?? null, found: !!u };
  }
  if (type === "formateur") {
    const f = await db.formateur.findUnique({ where: { id }, select: { userId: true } });
    return { userId: f?.userId ?? null, found: !!f };
  }
  const c = await db.candidat.findUnique({
    where: { id },
    select: { apprenant: { select: { userId: true } } },
  });
  return { userId: c?.apprenant?.userId ?? null, found: !!c };
}

/** Suspend / réactive le compte de connexion (déconnecte immédiatement si suspendu). */
export async function toggleCompteActif(type: CompteType, id: string): Promise<CompteActionState> {
  let me;
  try {
    me = await requireAdmin();
  } catch {
    return { error: "Non autorisé." };
  }
  const db = await getTenantDb();

  if (type === "collaborateur") {
    if (id === me.id) return { error: "Vous ne pouvez pas vous suspendre vous-même." };
    const u = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (u?.role === "ADMIN") return { error: "Un administrateur ne peut pas être suspendu ici." };
  }

  const { userId, found } = await loginUserId(db, type, id);
  if (!found) return { error: "Compte introuvable." };
  if (!userId) return { error: "Ce profil n'a pas de compte d'accès (rien à suspendre)." };

  const u = await db.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  if (!u) return { error: "Compte d'accès introuvable." };

  // Bascule d'activation → régénère l'identifiant de session : suspension = déconnexion
  // immédiate à la prochaine navigation.
  await db.user.update({
    where: { id: userId },
    data: { isActive: !u.isActive, activeSessionId: randomUUID() },
  });
  // Traçabilité (audit SEC-038) : journaliser suspension / réactivation.
  await db.auditLog
    .create({
      data: {
        userId: me.id,
        action: u.isActive ? "SUSPEND" : "REACTIVATE",
        entityType: "User",
        entityId: userId,
      },
    })
    .catch(() => {});
  revalidatePath("/administration/comptes");
  return { ok: true };
}

/** Supprime le compte. Jamais un ADMIN ni soi-même. Suppression FK-protégée. */
export async function supprimerCompte(type: CompteType, id: string): Promise<CompteActionState> {
  let me;
  try {
    me = await requireAdmin();
  } catch {
    return { error: "Non autorisé." };
  }
  const db = await getTenantDb();

  try {
    if (type === "collaborateur") {
      if (id === me.id) return { error: "Vous ne pouvez pas supprimer votre propre compte." };
      const u = await db.user.findUnique({ where: { id }, select: { role: true } });
      if (!u) return { error: "Compte introuvable." };
      if (u.role === "ADMIN") return { error: "Un administrateur ne peut pas être supprimé ici." };
      await db.user.delete({ where: { id } });
    } else if (type === "formateur") {
      await db.formateur.delete({ where: { id } });
    } else {
      await db.candidat.delete({ where: { id } });
    }
    // Traçabilité (audit SEC-038) : journaliser la suppression de compte.
    await db.auditLog
      .create({
        data: {
          userId: me.id,
          action: "DELETE",
          entityType:
            type === "collaborateur" ? "User" : type === "formateur" ? "Formateur" : "Candidat",
          entityId: id,
        },
      })
      .catch(() => {});
    revalidatePath("/administration/comptes");
    return { ok: true };
  } catch (e) {
    // Le plus souvent une contrainte de clé étrangère (sessions, inscriptions…).
    const msg = e instanceof Error ? e.message : "";
    if (/[Ff]oreign key|constraint failed|P2003|P2014/.test(msg)) {
      return {
        error:
          "Suppression impossible : ce compte est rattaché à des données (sessions, inscriptions…). Suspendez-le plutôt.",
      };
    }
    return { error: "Échec de la suppression." };
  }
}
