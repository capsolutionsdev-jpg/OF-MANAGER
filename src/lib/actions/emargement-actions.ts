"use server";

import { revalidatePath } from "next/cache";
import { SeanceType, PresenceStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Génère une séance par jour sur la période de la session et garantit
// qu'un dossier apprenant existe pour chaque inscrit (nécessaire à l'émargement).
export async function genererSeances(sessionId: string) {
  const session = await auth();
  if (!session?.user) return;

  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { seances: true, inscriptions: true },
  });
  if (!s) return;

  for (const insc of s.inscriptions) {
    const app = await prisma.apprenant.upsert({
      where: { candidatId: insc.candidatId },
      update: {},
      create: { candidatId: insc.candidatId },
    });
    if (!insc.apprenantId) {
      await prisma.inscription.update({
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
      await prisma.seance.create({
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

  await prisma.presence.upsert({
    where: { seanceId_apprenantId: { seanceId, apprenantId } },
    update: { statut },
    create: { seanceId, apprenantId, statut },
  });

  const seance = await prisma.seance.findUnique({
    where: { id: seanceId },
    select: { sessionId: true },
  });
  if (seance) revalidatePath(`/sessions/${seance.sessionId}/emargement`);
  return { ok: true };
}
