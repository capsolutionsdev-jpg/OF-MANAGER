"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";

type Res = { ok: boolean; error?: string };

/** Récupère l'apprenant lié à l'utilisateur connecté. */
async function currentApprenant() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const db = await getTenantDb();
  return db.apprenant.findUnique({ where: { userId: session.user.id } });
}

/** Vérifie que l'apprenant a bien accès au cours d'une leçon (cours attribué). */
async function leconAutorisee(apprenantId: string, leconId: string) {
  const db = await getTenantDb();
  const lecon = await db.lecon.findUnique({
    where: { id: leconId },
    select: { module: { select: { coursId: true } } },
  });
  if (!lecon) return null;
  const coursId = lecon.module.coursId;
  const acces = await db.coursApprenant.findUnique({
    where: { coursId_apprenantId: { coursId, apprenantId } },
  });
  return acces ? coursId : null;
}

/** Marque une leçon comme terminée (ou l'annule). */
export async function setLeconDone(
  leconId: string,
  done: boolean,
): Promise<Res> {
  const db = await getTenantDb();
  const apprenant = await currentApprenant();
  if (!apprenant) return { ok: false, error: "Non autorisé." };
  const coursId = await leconAutorisee(apprenant.id, leconId);
  if (!coursId) return { ok: false, error: "Accès refusé." };

  if (done) {
    await db.progressionLecon.upsert({
      where: { apprenantId_leconId: { apprenantId: apprenant.id, leconId } },
      update: {},
      create: { apprenantId: apprenant.id, leconId },
    });
  } else {
    await db.progressionLecon.deleteMany({
      where: { apprenantId: apprenant.id, leconId },
    });
  }
  revalidatePath(`/mes-cours/${coursId}`);
  revalidatePath("/mes-cours");
  return { ok: true };
}

/** Enregistre le score d'un quiz (calculé côté client pour QCU/QCM). */
export async function submitQuizResultat(
  leconId: string,
  score: number,
  total: number,
): Promise<Res> {
  const db = await getTenantDb();
  const apprenant = await currentApprenant();
  if (!apprenant) return { ok: false, error: "Non autorisé." };
  const coursId = await leconAutorisee(apprenant.id, leconId);
  if (!coursId) return { ok: false, error: "Accès refusé." };

  await db.quizResultat.upsert({
    where: { apprenantId_leconId: { apprenantId: apprenant.id, leconId } },
    update: { score, total },
    create: { apprenantId: apprenant.id, leconId, score, total },
  });
  // Réussir le quiz marque aussi la leçon comme vue
  await db.progressionLecon.upsert({
    where: { apprenantId_leconId: { apprenantId: apprenant.id, leconId } },
    update: {},
    create: { apprenantId: apprenant.id, leconId },
  });
  revalidatePath(`/mes-cours/${coursId}`);
  return { ok: true };
}
