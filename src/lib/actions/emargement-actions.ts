"use server";

import { revalidatePath } from "next/cache";
import { SeanceType, PresenceStatut } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";

// Génère une séance par jour sur la période de la session et garantit
// qu'un dossier apprenant existe pour chaque inscrit (nécessaire à l'émargement).
export async function genererSeances(sessionId: string) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const s = await db.session.findUnique({
    where: { id: sessionId },
    include: { seances: true, inscriptions: true },
  });
  if (!s) return;

  for (const insc of s.inscriptions) {
    const app = await db.apprenant.upsert({
      where: { candidatId: insc.candidatId },
      update: {},
      create: { candidatId: insc.candidatId },
    });
    if (!insc.apprenantId) {
      await db.inscription.update({
        where: { id: insc.id },
        data: { apprenantId: app.id },
      });
    }
  }

  if (s.seances.length === 0) {
    const d = new Date(s.dateDebut);
    d.setHours(0, 0, 0, 0);
    const end = new Date(s.dateFin);
    end.setHours(0, 0, 0, 0);
    let guard = 0;
    while (d <= end && guard < 60) {
      await db.seance.create({
        data: {
          sessionId,
          date: new Date(d),
          type: SeanceType.JOURNEE,
          heureDebut: "09:00",
          heureFin: "17:00",
        },
      });
      d.setDate(d.getDate() + 1);
      guard++;
    }
  }

  revalidatePath(`/sessions/${sessionId}/emargement`);
}

export async function setPresence(
  seanceId: string,
  apprenantId: string,
  statut: PresenceStatut,
): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };

  const db = await getTenantDb();
  await db.presence.upsert({
    where: { seanceId_apprenantId: { seanceId, apprenantId } },
    update: { statut },
    create: { seanceId, apprenantId, statut },
  });

  const seance = await db.seance.findUnique({
    where: { id: seanceId },
    select: { sessionId: true },
  });
  if (seance) revalidatePath(`/sessions/${seance.sessionId}/emargement`);
  return { ok: true };
}
