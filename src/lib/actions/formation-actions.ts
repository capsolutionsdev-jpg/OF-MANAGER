"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import {
  formationFormSchema,
  type FormationFormValues,
} from "@/lib/validators/formation";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);

function toData(v: FormationFormValues) {
  const tarifNum =
    v.tarif && v.tarif.trim() !== ""
      ? Number(v.tarif.replace(",", "."))
      : null;
  const heures =
    v.dureeHeures && v.dureeHeures.trim() !== ""
      ? parseInt(v.dureeHeures, 10)
      : null;

  return {
    titre: v.titre.trim(),
    reference: v.reference.trim(),
    certification: clean(v.certification),
    duree: clean(v.duree),
    dureeHeures: heures !== null && !Number.isNaN(heures) ? heures : null,
    tarif: tarifNum !== null && !Number.isNaN(tarifNum) ? tarifNum : null,
    modalite: v.modalite,
    academy: v.academy ? v.academy : null,
    objectifs: clean(v.objectifs),
    programme: clean(v.programme),
    prerequis: clean(v.prerequis),
    publicVise: clean(v.publicVise),
    methodesPedagogiques: clean(v.methodesPedagogiques),
    modalitesEvaluation: clean(v.modalitesEvaluation),
    conditionsAcces: clean(v.conditionsAcces),
    delaiAcces: clean(v.delaiAcces),
    piecesAttendues: toLines(v.piecesAttendues),
    examen: Boolean(v.examen),
    grilleInrs: clean(v.grilleInrs),
    diplomante: Boolean(v.diplomante),
    soumisJury: Boolean(v.soumisJury),
    nbJury: v.soumisJury && v.nbJury ? Number(v.nbJury) : null,
  };
}

// Convertit un texte multi-lignes en tableau (1 pièce par ligne, vides ignorées)
function toLines(s?: string): string[] {
  if (!s) return [];
  return s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");
}

export async function createFormation(
  values: FormationFormValues,
): Promise<ActionResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = formationFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  try {
    const formation = await db.formation.create({
      data: toData(parsed.data),
    });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Formation",
        entityId: formation.id,
      },
    });
    revalidatePath("/formations");
    return { ok: true, id: formation.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Cette référence est déjà utilisée." };
    }
    throw e;
  }
}

export async function updateFormation(
  id: string,
  values: FormationFormValues,
): Promise<ActionResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = formationFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  try {
    await db.formation.update({ where: { id }, data: toData(parsed.data) });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Formation",
        entityId: id,
      },
    });
    revalidatePath("/formations");
    revalidatePath(`/formations/${id}`);
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Cette référence est déjà utilisée." };
    }
    throw e;
  }
}

// --- Actions déclenchées par des boutons (formulaires serveur) ---

export async function archiveFormationAction(formData: FormData) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;
  const id = String(formData.get("id"));
  await db.formation.update({ where: { id }, data: { isArchived: true } });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "ARCHIVE",
      entityType: "Formation",
      entityId: id,
    },
  });
  revalidatePath("/formations");
  redirect("/formations");
}

export async function duplicateFormationAction(formData: FormData) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;
  const id = String(formData.get("id"));
  const src = await db.formation.findUnique({ where: { id } });
  if (!src) redirect("/formations");

  const copy = await db.formation.create({
    data: {
      titre: `${src.titre} (copie)`,
      reference: `${src.reference}-COPIE-${Date.now().toString().slice(-5)}`,
      certification: src.certification,
      duree: src.duree,
      dureeHeures: src.dureeHeures,
      tarif: src.tarif,
      modalite: src.modalite,
      objectifs: src.objectifs,
      programme: src.programme,
      prerequis: src.prerequis,
      publicVise: src.publicVise,
      methodesPedagogiques: src.methodesPedagogiques,
      modalitesEvaluation: src.modalitesEvaluation,
      conditionsAcces: src.conditionsAcces,
      delaiAcces: src.delaiAcces,
      piecesAttendues: src.piecesAttendues,
      examen: src.examen,
      grilleInrs: src.grilleInrs,
      diplomante: src.diplomante,
      soumisJury: src.soumisJury,
      nbJury: src.nbJury,
      version: src.version + 1,
      parentId: src.id,
    },
  });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DUPLICATE",
      entityType: "Formation",
      entityId: copy.id,
    },
  });
  revalidatePath("/formations");
  redirect(`/formations/${copy.id}/modifier`);
}
