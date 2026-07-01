"use server";

import { revalidatePath } from "next/cache";
import { DepenseCategorie, DepenseStatut } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

async function requireStaff() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  const userId = session?.user?.id;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId || !userId) {
    throw new Error("Non autorisé.");
  }
  return { organismeId, userId };
}

type Result = { ok: true } | { ok: false; error: string };

export type CreateDepenseInput = {
  date: string; // ISO
  categorie: DepenseCategorie;
  categorieAutre?: string;
  libelle?: string;
  montantEuros: number;
  numeroPiece?: string;
  statut: DepenseStatut;
  notes?: string;
};

/** Enregistre une dépense/charge du centre. */
export async function createDepense(input: CreateDepenseInput): Promise<Result> {
  const { organismeId, userId } = await requireStaff();
  const categorie = input.categorie;
  const statut = input.statut;
  const montantCents = Math.round(Math.max(0, Number(input.montantEuros ?? 0)) * 100);

  if (!Object.values(DepenseCategorie).includes(categorie)) {
    return { ok: false, error: "Catégorie invalide." };
  }
  if (!Object.values(DepenseStatut).includes(statut)) {
    return { ok: false, error: "Statut invalide." };
  }
  if (montantCents <= 0) return { ok: false, error: "Montant invalide." };
  const categorieAutre =
    categorie === "AUTRE" ? (input.categorieAutre ?? "").trim() || null : null;
  if (categorie === "AUTRE" && !categorieAutre) {
    return { ok: false, error: "Précisez le nom de la catégorie « Autre »." };
  }

  await prisma.depenseCentre.create({
    data: {
      organismeId,
      date: input.date ? new Date(input.date) : new Date(),
      categorie,
      categorieAutre,
      libelle: (input.libelle ?? "").trim() || null,
      montantCents,
      numeroPiece: (input.numeroPiece ?? "").trim() || null,
      statut,
      notes: (input.notes ?? "").trim() || null,
      createdById: userId,
    },
  });
  revalidatePath("/tresorerie");
  return { ok: true };
}

/** Bascule l'état de règlement d'une dépense (payé / en attente). */
export async function setDepenseStatut(id: string, statut: DepenseStatut): Promise<Result> {
  const { organismeId } = await requireStaff();
  if (!Object.values(DepenseStatut).includes(statut)) {
    return { ok: false, error: "Statut invalide." };
  }
  const res = await prisma.depenseCentre.updateMany({
    where: { id, organismeId },
    data: { statut },
  });
  if (res.count === 0) return { ok: false, error: "Dépense introuvable." };
  revalidatePath("/tresorerie");
  return { ok: true };
}

/** Supprime une dépense. */
export async function deleteDepense(id: string): Promise<Result> {
  const { organismeId } = await requireStaff();
  const res = await prisma.depenseCentre.deleteMany({ where: { id, organismeId } });
  if (res.count === 0) return { ok: false, error: "Dépense introuvable." };
  revalidatePath("/tresorerie");
  return { ok: true };
}
