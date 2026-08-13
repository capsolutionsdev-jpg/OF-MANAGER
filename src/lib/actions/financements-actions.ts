"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTenantDb } from "@/lib/tenant";
import { encryptSecret } from "@/lib/crypto";
import { testWedofKey, wedofKeyOf, listRegistrationFolders, mapFolder } from "@/lib/wedof";

type Res = { ok: boolean; error?: string };

const STAFF_ADMIN = ["ADMIN", "RESPONSABLE_FORMATION"];

async function requireAdminOrg(): Promise<string | null> {
  const session = await auth();
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !organismeId || !STAFF_ADMIN.includes(session.user.role as string)) return null;
  return organismeId;
}

/**
 * Enregistre la clé API Wedof de l'organisme (chiffrée). On VÉRIFIE d'abord la
 * clé auprès de Wedof pour éviter d'enregistrer une clé invalide.
 */
export async function saveWedofKey(formData: FormData): Promise<Res> {
  const organismeId = await requireAdminOrg();
  if (!organismeId) return { ok: false, error: "Non autorisé." };

  const key = String(formData.get("wedofApiKey") ?? "").trim();
  if (!key) return { ok: false, error: "Collez votre clé API Wedof." };

  const test = await testWedofKey(key);
  if (!test.ok) return { ok: false, error: test.error ?? "Clé refusée par Wedof." };

  await prisma.organisme.update({
    where: { id: organismeId },
    data: { wedofApiKey: encryptSecret(key) },
  });
  revalidatePath("/financements");
  return { ok: true };
}

/**
 * Enregistre le secret des notifications Wedof (le même que celui saisi dans
 * Wedof lors de la création du webhook), chiffré. Sert à vérifier la signature
 * des notifications entrantes.
 */
export async function saveWedofWebhookSecret(formData: FormData): Promise<Res> {
  const organismeId = await requireAdminOrg();
  if (!organismeId) return { ok: false, error: "Non autorisé." };
  const secret = String(formData.get("wedofWebhookSecret") ?? "").trim();
  await prisma.organisme.update({
    where: { id: organismeId },
    data: { wedofWebhookSecret: secret ? encryptSecret(secret) : null },
  });
  revalidatePath("/financements");
  return { ok: true };
}

/** Débranche le compte Wedof (efface la clé + le secret webhook). */
export async function removeWedofKey(): Promise<Res> {
  const organismeId = await requireAdminOrg();
  if (!organismeId) return { ok: false, error: "Non autorisé." };
  await prisma.organisme.update({
    where: { id: organismeId },
    data: { wedofApiKey: null, wedofWebhookSecret: null },
  });
  revalidatePath("/financements");
  return { ok: true };
}

/**
 * Récupère les dossiers CPF depuis Wedof et les met à jour chez nous
 * (création/mise à jour par identifiant Wedof, rattachement au candidat par
 * e-mail). Renvoie le nombre de dossiers traités.
 */
export async function syncWedof(): Promise<{ ok: boolean; error?: string; count?: number }> {
  const organismeId = await requireAdminOrg();
  if (!organismeId) return { ok: false, error: "Non autorisé." };

  const org = await prisma.organisme.findUnique({
    where: { id: organismeId },
    select: { wedofApiKey: true },
  });
  const key = wedofKeyOf(org?.wedofApiKey);
  if (!key) return { ok: false, error: "Aucune clé Wedof enregistrée." };

  let folders;
  try {
    folders = await listRegistrationFolders(key, { limit: 100 });
  } catch {
    return { ok: false, error: "Impossible de récupérer les dossiers depuis Wedof." };
  }

  const db = await getTenantDb();
  let count = 0;
  for (const f of folders) {
    const m = mapFolder(f);
    if (!m.wedofId) continue;

    let candidatId: string | null = null;
    if (m.email) {
      const c = await db.candidat.findFirst({ where: { email: m.email }, select: { id: true } });
      candidatId = c?.id ?? null;
    }

    const data = {
      type: m.type,
      financeur: m.financeur,
      etat: m.etat,
      montant: m.montant,
      wedofEtat: m.wedofEtat,
      wedofMajLe: m.wedofMajLe,
    };
    await db.dossierFinancement.upsert({
      where: { wedofId: m.wedofId },
      create: { wedofId: m.wedofId, candidatId, ...data },
      update: { ...data, ...(candidatId ? { candidatId } : {}) },
    });
    count++;
  }

  revalidatePath("/financements");
  return { ok: true, count };
}
