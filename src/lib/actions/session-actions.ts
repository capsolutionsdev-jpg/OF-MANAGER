"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
  return {
    formationId: v.formationId,
    reference: clean(v.reference),
    dateDebut: new Date(v.dateDebut),
    dateFin: new Date(v.dateFin),
    horaires: clean(v.horaires),
    lieu: clean(v.lieu),
    modalite: v.modalite,
    nbPlaces: Number.isNaN(places) ? 10 : places,
    statut: v.statut,
  };
}

export async function createSession(
  values: SessionFormValues,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = sessionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  try {
    const ids = parsed.data.formateurIds ?? [];
    const created = await prisma.session.create({
      data: {
        ...toData(parsed.data),
        createdById: session.user.id,
        formateurs: { connect: ids.map((fid) => ({ id: fid })) },
      },
    });
    await prisma.auditLog.create({
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
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = sessionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  try {
    const ids = parsed.data.formateurIds ?? [];
    await prisma.session.update({
      where: { id },
      data: {
        ...toData(parsed.data),
        formateurs: { set: ids.map((fid) => ({ id: fid })) },
      },
    });
    await prisma.auditLog.create({
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
