"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import {
  sessionFormSchema,
  type SessionFormValues,
} from "@/lib/validators/session";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);

function toData(v: SessionFormValues) {
  const places =
    v.nbPlaces && v.nbPlaces.trim() !== "" ? parseInt(v.nbPlaces, 10) : 10;
  const tarif =
    v.tarifFormateurJour && v.tarifFormateurJour.trim() !== ""
      ? Number(v.tarifFormateurJour.replace(",", "."))
      : null;
  return {
    formationId: v.formationId,
    reference: clean(v.reference),
    dateDebut: new Date(v.dateDebut),
    dateFin: new Date(v.dateFin),
    horaires: clean(v.horaires),
    lieu: clean(v.lieu),
    dateExamen: v.dateExamen && v.dateExamen.trim() !== "" ? new Date(v.dateExamen) : null,
    lieuExamen: clean(v.lieuExamen),
    salleId: clean(v.salleId),
    modalite: v.modalite,
    nbPlaces: Number.isNaN(places) ? 10 : places,
    statut: v.statut,
    tarifFormateurJour: tarif !== null && !Number.isNaN(tarif) ? tarif : null,
  };
}

export async function createSession(
  values: SessionFormValues,
): Promise<ActionResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = sessionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  try {
    const ids = parsed.data.formateurIds ?? [];
    const created = await db.session.create({
      data: {
        ...toData(parsed.data),
        createdById: session.user.id,
        formateurs: { connect: ids.map((fid) => ({ id: fid })) },
      },
    });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Session",
        entityId: created.id,
      },
    });
    revalidatePath("/sessions");
    return { ok: true, id: created.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Cette référence de session est déjà utilisée." };
    }
    throw e;
  }
}

export async function updateSession(
  id: string,
  values: SessionFormValues,
): Promise<ActionResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = sessionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  try {
    const ids = parsed.data.formateurIds ?? [];
    await db.session.update({
      where: { id },
      data: {
        ...toData(parsed.data),
        formateurs: { set: ids.map((fid) => ({ id: fid })) },
      },
    });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Session",
        entityId: id,
      },
    });
    revalidatePath("/sessions");
    revalidatePath(`/sessions/${id}`);
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Cette référence de session est déjà utilisée." };
    }
    throw e;
  }
}

/**
 * Phase 3 — certification : marque (ou annule) la déclaration des résultats
 * d'examen au certificateur pour une session. Déclenché par un bouton.
 */
export async function setResultatsDeclares(formData: FormData) {
  const db = await getTenantDb();
  const id = String(formData.get("id"));
  const declared = String(formData.get("declared")) === "true";
  await db.session.update({
    where: { id },
    data: { resultatsDeclaresAt: declared ? new Date() : null },
  });
  revalidatePath(`/sessions/${id}`);
}
