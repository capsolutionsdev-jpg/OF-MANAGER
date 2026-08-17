"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { niveauForPoste, labelForPoste } from "@/lib/postes";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { SECTION_KEYS } from "@/lib/permissions";
import { getSeatInfo, EXTRA_SEAT_PRICE_EUR } from "@/lib/seats";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Action réservée à l'administrateur.");
  }
  // Revalidation en base (audit P3) : un ADMIN rétrogradé ou désactivé ne doit
  // pas conserver ses pouvoirs via un ancien JWT. Le client scopé filtre User
  // par organisme (findUnique → findFirst { id, organismeId }).
  const db = await getTenantDb();
  const fresh = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });
  if (!fresh || !fresh.isActive || fresh.role !== "ADMIN") {
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
  let me;
  try {
    me = await requireAdmin();
  } catch {
    return { error: "Non autorisé." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const poste = String(formData.get("poste") ?? "assistant-administratif");
  const role = niveauForPoste(poste);

  if (!name) return { error: "Le nom est requis." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail invalide." };
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return { error: "Un compte existe déjà avec cet e-mail." };

  // Limite de sièges back-office (comptes ADMIN/RESPONSABLE/ASSISTANT) selon la
  // formule. Un override manuel de l'éditeur (sièges payants) prime. Les
  // formateurs et apprenants ne comptent pas comme sièges facturés.
  if (me.organismeId) {
    const seat = await getSeatInfo(me.organismeId);
    if (!seat.canAdd) {
      return {
        error: `Limite de ${seat.limit} compte(s) back-office atteinte pour votre formule. Compte supplémentaire : ${EXTRA_SEAT_PRICE_EUR} € HT/mois — contactez OFManager pour augmenter votre forfait.`,
      };
    }
  }

  await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      fonction: labelForPoste(poste) || null,
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
  const poste = String(formData.get("poste") ?? "assistant-administratif");
  await db.user.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      role: niveauForPoste(poste),
      fonction: labelForPoste(poste) || null,
      permissions: lirePermissions(formData),
      // Rôle/permissions modifiés → on invalide la session active du compte
      // pour que les nouveaux droits prennent effet immédiatement (le token JWT
      // sera rejeté à la prochaine navigation, forçant une reconnexion).
      activeSessionId: randomUUID(),
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
    // Mot de passe réinitialisé → on invalide la session active (le compte
    // devra se reconnecter avec le nouveau mot de passe).
    data: { passwordHash: await bcrypt.hash(password, 12), activeSessionId: randomUUID() },
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
  // Bascule d'activation → on régénère l'identifiant de session : une
  // désactivation déconnecte immédiatement le compte à sa prochaine navigation.
  await db.user.update({
    where: { id },
    data: { isActive: !u.isActive, activeSessionId: randomUUID() },
  });
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
