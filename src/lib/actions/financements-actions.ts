"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTenantDb } from "@/lib/tenant";
import { encryptSecret } from "@/lib/crypto";
import { testWedofKey, wedofKeyOf, listRegistrationFolders, mapFolder } from "@/lib/wedof";
import { wedofOrderedWhere } from "@/lib/wedof-sync";

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

  const db = await getTenantDb();
  const LIMIT = 100;
  const MAX_PAGES = 100; // garde-fou de volume (≤ 10 000 dossiers par synchronisation)
  let count = 0;
  let incomplet = false;

  // Pagination jusqu'à épuisement (A12-010 : l'ancien code ne traitait que la page 1).
  for (let page = 1; page <= MAX_PAGES; page++) {
    let folders;
    try {
      folders = await listRegistrationFolders(key, { limit: LIMIT, page });
    } catch {
      // On renvoie ce qui a déjà été traité + un signalement (sync partielle).
      return {
        ok: false,
        error: "Récupération Wedof interrompue — dossiers partiellement synchronisés.",
        count,
      };
    }
    if (folders.length === 0) break;

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
      // Garde d'ordre (A12-006) : ne pas régresser un état plus récent. Le client
      // tenant (scopedPrisma) injecte automatiquement organismeId dans le where.
      const upd = await db.dossierFinancement.updateMany({
        where: wedofOrderedWhere(m.wedofId, m.wedofMajLe),
        data: { ...data, ...(candidatId ? { candidatId } : {}) },
      });
      if (upd.count === 0) {
        const exists = await db.dossierFinancement.findFirst({
          where: { wedofId: m.wedofId },
          select: { id: true },
        });
        if (!exists) await db.dossierFinancement.create({ data: { wedofId: m.wedofId, candidatId, ...data } });
        // sinon : événement plus ancien que l'état stocké → ignoré
      }
      count++;
    }

    if (folders.length < LIMIT) break;
    if (page === MAX_PAGES) incomplet = true;
  }

  revalidatePath("/financements");
  return {
    ok: true,
    count,
    ...(incomplet ? { error: "Volume élevé : synchronisation plafonnée, relancez pour la suite." } : {}),
  };
}
