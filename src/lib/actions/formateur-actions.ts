"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import {
  formateurFormSchema,
  type FormateurFormValues,
} from "@/lib/validators/formateur";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);

function toData(v: FormateurFormValues) {
  const exp =
    v.experienceAnnees && v.experienceAnnees.trim() !== ""
      ? parseInt(v.experienceAnnees, 10)
      : null;
  const tarif =
    v.tarifJournalier && v.tarifJournalier.trim() !== ""
      ? Number(v.tarifJournalier.replace(",", "."))
      : null;
  return {
    nom: v.nom.trim(),
    prenom: v.prenom.trim(),
    email: clean(v.email),
    telephone: clean(v.telephone),
    specialites: clean(v.specialites),
    experienceAnnees: exp !== null && !Number.isNaN(exp) ? exp : null,
    adresse: clean(v.adresse),
    siret: clean(v.siret),
    tarifJournalier: tarif !== null && !Number.isNaN(tarif) ? tarif : null,
    academies: v.academies ?? [],
  };
}

export async function createFormateur(
  values: FormateurFormValues,
): Promise<ActionResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const parsed = formateurFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const ids = parsed.data.formationIds ?? [];
  const formateur = await db.formateur.create({
    data: { ...toData(parsed.data), formations: { connect: ids.map((fid) => ({ id: fid })) } },
  });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entityType: "Formateur",
      entityId: formateur.id,
    },
  });
  revalidatePath("/formateurs");
  return { ok: true, id: formateur.id };
}

export async function updateFormateur(
  id: string,
  values: FormateurFormValues,
): Promise<ActionResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const parsed = formateurFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const ids = parsed.data.formationIds ?? [];
  await db.formateur.update({
    where: { id },
    data: { ...toData(parsed.data), formations: { set: ids.map((fid) => ({ id: fid })) } },
  });
  revalidatePath("/formateurs");
  revalidatePath(`/formateurs/${id}`);
  return { ok: true, id };
}
