"use server";

import bcrypt from "bcryptjs";
import { isPasswordPwned } from "@/lib/security/password";
import { z } from "zod";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

export type ChangePasswordState = {
  ok?: boolean;
  error?: string;
};

const schema = z
  .object({
    current: z.string().min(1, "Mot de passe actuel requis."),
    next: z
      .string()
      .min(8, "Le nouveau mot de passe doit faire au moins 8 caractères.")
      .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre.")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre."),
    confirm: z.string().min(1, "Confirmation requise."),
  })
  .refine((d) => d.next === d.confirm, {
    message: "La confirmation ne correspond pas au nouveau mot de passe.",
    path: ["confirm"],
  });

export async function changePassword(
  _prev: ChangePasswordState | undefined,
  formData: FormData,
): Promise<ChangePasswordState> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Session expirée. Reconnectez-vous." };
  }

  const parsed = schema.safeParse({
    current: String(formData.get("current") ?? ""),
    next: String(formData.get("next") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) return { error: "Compte introuvable." };

  const valid = await bcrypt.compare(parsed.data.current, user.passwordHash);
  if (!valid) return { error: "Le mot de passe actuel est incorrect." };

  if (await bcrypt.compare(parsed.data.next, user.passwordHash)) {
    return { error: "Le nouveau mot de passe doit être différent de l'ancien." };
  }
  if (await isPasswordPwned(parsed.data.next)) {
    return { error: "Ce mot de passe figure dans une fuite de données connue — choisissez-en un autre." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.next, 12);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  return { ok: true };
}

const forceSchema = z
  .object({
    next: z
      .string()
      .min(8, "Le mot de passe doit faire au moins 8 caractères.")
      .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre.")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre."),
    confirm: z.string().min(1, "Confirmation requise."),
  })
  .refine((d) => d.next === d.confirm, {
    message: "La confirmation ne correspond pas.",
    path: ["confirm"],
  });

/**
 * Changement de mot de passe FORCÉ à la première connexion (compte candidat créé
 * avec un mot de passe provisoire). Ne redemande pas le mot de passe temporaire
 * (l'utilisateur est déjà authentifié) et lève l'indicateur `mustChangePassword`.
 */
export async function forceChangePassword(
  _prev: ChangePasswordState | undefined,
  formData: FormData,
): Promise<ChangePasswordState> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user?.id) return { error: "Session expirée. Reconnectez-vous." };

  const parsed = forceSchema.safeParse({
    next: String(formData.get("next") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Compte introuvable." };
  if (await bcrypt.compare(parsed.data.next, user.passwordHash)) {
    return { error: "Choisissez un mot de passe différent du mot de passe provisoire." };
  }
  if (await isPasswordPwned(parsed.data.next)) {
    return { error: "Ce mot de passe figure dans une fuite de données connue — choisissez-en un autre." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 12), mustChangePassword: false },
  });
  return { ok: true };
}
