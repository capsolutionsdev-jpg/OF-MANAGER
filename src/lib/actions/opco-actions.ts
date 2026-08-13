"use server";

import { revalidatePath } from "next/cache";
import { DossierFinancementEtat } from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

type Res = { ok: boolean; error?: string; id?: string };

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !session.user.organismeId || !STAFF.includes(session.user.role as string)) return null;
  return session.user.organismeId;
}

/**
 * Crée un dossier de financement OPCO pour une inscription. Le candidat et la
 * formation sont déduits de l'inscription.
 */
export async function createDossierOpco(input: {
  inscriptionId: string;
  financeur: string;
  montant?: number | null;
  subrogation?: boolean;
}): Promise<Res> {
  if (!(await requireStaff())) return { ok: false, error: "Non autorisé." };
  const financeur = input.financeur.trim();
  if (!input.inscriptionId) return { ok: false, error: "Choisissez une inscription." };
  if (!financeur) return { ok: false, error: "Indiquez l'OPCO financeur." };

  const db = await getTenantDb();
  const insc = await db.inscription.findUnique({
    where: { id: input.inscriptionId },
    select: { id: true, candidatId: true },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  const d = await db.dossierFinancement.create({
    data: {
      type: "OPCO",
      financeur,
      etat: "A_MONTER",
      inscriptionId: insc.id,
      candidatId: insc.candidatId,
      montant: input.montant ?? null,
      priseEnChargeMontant: input.montant ?? null,
      subrogation: !!input.subrogation,
    },
    select: { id: true },
  });
  revalidatePath("/financements");
  return { ok: true, id: d.id };
}

/** Met à jour les infos d'un dossier OPCO (n° dossier, montant, subrogation). */
export async function updateDossierOpco(
  id: string,
  input: { financeur?: string; montant?: number | null; opcoNumero?: string | null; subrogation?: boolean },
): Promise<Res> {
  if (!(await requireStaff())) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  await db.dossierFinancement.update({
    where: { id },
    data: {
      ...(input.financeur !== undefined ? { financeur: input.financeur.trim() || null } : {}),
      ...(input.montant !== undefined ? { montant: input.montant, priseEnChargeMontant: input.montant } : {}),
      ...(input.opcoNumero !== undefined ? { opcoNumero: input.opcoNumero?.trim() || null } : {}),
      ...(input.subrogation !== undefined ? { subrogation: input.subrogation } : {}),
    },
  });
  revalidatePath("/financements");
  return { ok: true };
}

/** Fait avancer l'état d'un dossier. Enregistre la date d'accord si « Accepté ». */
export async function setDossierEtat(id: string, etat: DossierFinancementEtat): Promise<Res> {
  if (!(await requireStaff())) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  await db.dossierFinancement.update({
    where: { id },
    data: { etat, ...(etat === "ACCEPTE" ? { accordLe: new Date() } : {}) },
  });
  revalidatePath("/financements");
  return { ok: true };
}

/** Supprime un dossier de financement. */
export async function deleteDossier(id: string): Promise<Res> {
  if (!(await requireStaff())) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  await db.dossierFinancement.delete({ where: { id } });
  revalidatePath("/financements");
  return { ok: true };
}
