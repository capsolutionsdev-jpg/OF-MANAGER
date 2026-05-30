"use server";

import { revalidatePath } from "next/cache";
import { CandidatStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  candidatFormSchema,
  type CandidatFormValues,
} from "@/lib/validators/candidat";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);

function toData(v: CandidatFormValues) {
  return {
    nom: v.nom.trim(),
    prenom: v.prenom.trim(),
    email: v.email.trim(),
    telephone: clean(v.telephone),
    dateNaissance: v.dateNaissance ? new Date(v.dateNaissance) : null,
    adresse: clean(v.adresse),
    ville: clean(v.ville),
    codePostal: clean(v.codePostal),
    pays: clean(v.pays) ?? "France",
    situationPro: clean(v.situationPro),
    employeur: clean(v.employeur),
    posteOccupe: clean(v.posteOccupe),
    financementType: v.financementType ? v.financementType : null,
    statut: v.statut,
  };
}

export async function createCandidat(
  values: CandidatFormValues,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = candidatFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const candidat = await prisma.candidat.create({
    data: { ...toData(parsed.data), createdById: session.user.id },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entityType: "Candidat",
      entityId: candidat.id,
    },
  });

  revalidatePath("/candidats");
  return { ok: true, id: candidat.id };
}

export async function updateCandidat(
  id: string,
  values: CandidatFormValues,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = candidatFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  await prisma.candidat.update({
    where: { id },
    data: toData(parsed.data),
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Candidat",
      entityId: id,
    },
  });

  revalidatePath("/candidats");
  revalidatePath(`/candidats/${id}`);
  return { ok: true, id };
}

export async function archiveCandidat(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  await prisma.candidat.update({
    where: { id },
    data: { statut: "ARCHIVE" },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "ARCHIVE",
      entityType: "Candidat",
      entityId: id,
    },
  });

  revalidatePath("/candidats");
  return { ok: true, id };
}

export async function setCandidatStatut(
  id: string,
  statut: CandidatStatut,
): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };

  await prisma.candidat.update({ where: { id }, data: { statut } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "STATUT",
      entityType: "Candidat",
      entityId: id,
    },
  });
  revalidatePath("/crm");
  revalidatePath("/candidats");
  return { ok: true };
}
