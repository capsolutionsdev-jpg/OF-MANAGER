"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { generateTotpSecret, otpauthUri, verifyTotp } from "@/lib/totp";

// Démarre l'enrôlement 2FA : génère un secret (chiffré au repos, NON activé tant
// qu'un premier code n'a pas confirmé que l'app d'authentification est bien réglée).
export async function startTotpEnrollment(): Promise<
  { ok: true; secret: string; uri: string } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non autorisé." };
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpSecret: encryptSecret(secret), totpEnabled: false },
  });
  return { ok: true, secret, uri: otpauthUri(secret, session.user.email ?? "compte") };
}

// Active la 2FA après vérification d'un premier code (preuve que l'app est réglée).
export async function confirmTotp(code: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non autorisé." };
  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpSecret: true },
  });
  const secret = decryptSecret(u?.totpSecret);
  if (!secret) return { ok: false, error: "Aucun enrôlement en cours." };
  if (!verifyTotp(secret, code)) return { ok: false, error: "Code invalide, réessayez." };
  await prisma.user.update({ where: { id: session.user.id }, data: { totpEnabled: true } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      organismeId: session.user.organismeId ?? undefined,
      action: "UPDATE",
      entityType: "User",
      entityId: session.user.id,
      changesJson: { totpEnabled: true },
    },
  });
  revalidatePath("/mon-compte");
  return { ok: true };
}

// Désactive la 2FA — exige un code valide (empêche la désactivation via une
// session volée sans accès à l'app d'authentification).
export async function disableTotp(code: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non autorisé." };
  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpSecret: true, totpEnabled: true },
  });
  if (!u?.totpEnabled) return { ok: true };
  const secret = decryptSecret(u.totpSecret);
  if (!secret || !verifyTotp(secret, code)) return { ok: false, error: "Code invalide." };
  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpEnabled: false, totpSecret: null },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      organismeId: session.user.organismeId ?? undefined,
      action: "UPDATE",
      entityType: "User",
      entityId: session.user.id,
      changesJson: { totpEnabled: false },
    },
  });
  revalidatePath("/mon-compte");
  return { ok: true };
}
