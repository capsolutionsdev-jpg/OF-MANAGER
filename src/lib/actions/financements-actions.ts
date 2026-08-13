"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";

type Res = { ok: boolean; error?: string };

const STAFF_ADMIN = ["ADMIN", "RESPONSABLE_FORMATION"];

/**
 * Enregistre (ou remplace) la clé API Wedof de l'organisme, chiffrée en base.
 * C'est l'OF qui branche SON compte Wedof (le certificateur l'impose souvent).
 * Réservé aux gestionnaires.
 */
export async function saveWedofKey(formData: FormData): Promise<Res> {
  const session = await auth();
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !organismeId || !STAFF_ADMIN.includes(session.user.role as string)) {
    return { ok: false, error: "Non autorisé." };
  }
  const key = String(formData.get("wedofApiKey") ?? "").trim();
  if (!key) return { ok: false, error: "Collez votre clé API Wedof." };

  await prisma.organisme.update({
    where: { id: organismeId },
    data: { wedofApiKey: encryptSecret(key) },
  });
  revalidatePath("/financements");
  return { ok: true };
}

/** Débranche le compte Wedof (efface la clé). */
export async function removeWedofKey(): Promise<Res> {
  const session = await auth();
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !organismeId || !STAFF_ADMIN.includes(session.user.role as string)) {
    return { ok: false, error: "Non autorisé." };
  }
  await prisma.organisme.update({
    where: { id: organismeId },
    data: { wedofApiKey: null, wedofWebhookSecret: null },
  });
  revalidatePath("/financements");
  return { ok: true };
}
