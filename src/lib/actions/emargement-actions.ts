"use server";

import { revalidatePath } from "next/cache";
import { SeanceType, PresenceStatut } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { joursSession } from "@/lib/emargement";

// Génère une séance par jour sur la période de la session et garantit
// qu'un dossier apprenant existe pour chaque inscrit (nécessaire à l'émargement).
export async function genererSeances(sessionId: string) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const s = await db.session.findUnique({
    where: { id: sessionId },
    include: { seances: true, inscriptions: true, formateurs: true },
  });
  if (!s) return;

  // Si la session n'a qu'un seul formateur, il est affecté d'office à chaque
  // séance (les formations longues à plusieurs formateurs se règlent séance
  // par séance via setSeanceFormateur).
  const formateurParDefaut = s.formateurs.length === 1 ? s.formateurs[0].id : null;

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
    // Jours ouvrés (hors week-ends ET jours fériés), sans plafond à 60 jours :
    // logique unifiée avec joursSession (A06-004 troncature + A06-019 cohérence).
    for (const jour of joursSession([], s.dateDebut, s.dateFin)) {
      await db.seance.create({
        data: {
          sessionId,
          date: jour,
          type: SeanceType.JOURNEE,
          heureDebut: "09:00",
          heureFin: "17:00",
          formateurId: formateurParDefaut,
        },
      });
    }
  }

  revalidatePath(`/sessions/${sessionId}/emargement`);
}

/** Affecte (ou retire) le formateur d'une séance (formations longues : un
 *  formateur différent par jour). `formateurId` vide = aucun formateur. */
export async function setSeanceFormateur(seanceId: string, formateurId: string) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;
  const seance = await db.seance.findUnique({
    where: { id: seanceId },
    select: { sessionId: true },
  });
  if (!seance) return;
  await db.seance.update({
    where: { id: seanceId },
    data: { formateurId: formateurId.trim() !== "" ? formateurId : null },
  });
  revalidatePath(`/sessions/${seance.sessionId}/emargement`);
}

export async function setPresence(
  seanceId: string,
  apprenantId: string,
  statut: PresenceStatut,
): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };

  const db = await getTenantDb();
  // On évite upsert({ where: { seanceId_apprenantId } }) : le wrapper multi-tenant
  // vérifie l'appartenance via findFirst, qui n'accepte pas la clé composite.
  // Update ciblé (where scalaire), sinon création.
  const updated = await db.presence.updateMany({
    where: { seanceId, apprenantId },
    data: { statut },
  });
  if (updated.count === 0) {
    await db.presence.create({ data: { seanceId, apprenantId, statut } });
  }

  const seance = await db.seance.findUnique({
    where: { id: seanceId },
    select: { sessionId: true },
  });
  if (seance) revalidatePath(`/sessions/${seance.sessionId}/emargement`);
  return { ok: true };
}

/**
 * Marque TOUS les participants d'une séance « présents » en une action (A10-006).
 * Le cas nominal (tout le monde est là) ne demande plus un clic par stagiaire ;
 * les absents/retards se corrigent ensuite individuellement.
 */
export async function setAllPresent(
  seanceId: string,
): Promise<{ ok: boolean; count: number }> {
  const session = await auth();
  if (!session?.user) return { ok: false, count: 0 };

  const db = await getTenantDb();
  const seance = await db.seance.findUnique({
    where: { id: seanceId },
    select: {
      sessionId: true,
      session: {
        select: {
          inscriptions: {
            where: { apprenantId: { not: null } },
            select: { apprenantId: true },
          },
        },
      },
    },
  });
  if (!seance) return { ok: false, count: 0 };

  const apprenantIds = seance.session.inscriptions
    .map((i) => i.apprenantId)
    .filter((id): id is string => !!id);

  // Update en masse des présences existantes → PRESENT, puis création des
  // manquantes. On évite l'upsert à clé composite (incompatible avec le contrôle
  // d'appartenance du wrapper multi-tenant).
  const existing = await db.presence.findMany({
    where: { seanceId },
    select: { apprenantId: true },
  });
  const have = new Set(existing.map((e) => e.apprenantId));
  await db.presence.updateMany({
    where: { seanceId },
    data: { statut: PresenceStatut.PRESENT },
  });
  const missing = apprenantIds.filter((a) => !have.has(a));
  if (missing.length > 0) {
    await db.presence.createMany({
      data: missing.map((apprenantId) => ({
        seanceId,
        apprenantId,
        statut: PresenceStatut.PRESENT,
      })),
    });
  }

  revalidatePath(`/sessions/${seance.sessionId}/emargement`);
  return { ok: true, count: apprenantIds.length };
}
