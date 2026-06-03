"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  inscriptionFormSchema,
  type InscriptionFormValues,
} from "@/lib/validators/inscription";
import { startParcours } from "@/lib/actions/parcours-actions";

export type ActionResult =
  | { ok: true; inscriptionId: string }
  | { ok: false; error: string };

export async function createInscription(
  values: InscriptionFormValues,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = inscriptionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const v = parsed.data;

  const montant =
    v.montant && v.montant.trim() !== ""
      ? Number(v.montant.replace(",", "."))
      : null;

  try {
    const created = await prisma.inscription.create({
      data: {
        candidatId: v.candidatId,
        sessionId: v.sessionId,
        financementType: v.financementType ? v.financementType : null,
        statut: v.statut,
        montant: montant !== null && !Number.isNaN(montant) ? montant : null,
        source: "manuel",
      },
    });

    // Si l'inscription est validée : créer/garantir le dossier apprenant
    // et passer le candidat au statut INSCRIT.
    if (v.statut === "VALIDEE") {
      const apprenant = await prisma.apprenant.upsert({
        where: { candidatId: v.candidatId },
        update: {},
        create: { candidatId: v.candidatId },
      });
      await prisma.inscription.update({
        where: { id: created.id },
        data: { apprenantId: apprenant.id },
      });
      await prisma.candidat.update({
        where: { id: v.candidatId },
        data: { statut: "INSCRIT" },
      });
      // Démarre le parcours automatisé (e-mail + lien de finalisation)
      await startParcours(created.id);
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Inscription",
        entityId: created.id,
      },
    });

    revalidatePath(`/sessions/${v.sessionId}`);
    revalidatePath(`/candidats/${v.candidatId}`);
    revalidatePath("/crm");
    revalidatePath("/candidats");
    return { ok: true, inscriptionId: created.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ce candidat est déjà inscrit à cette session." };
    }
    throw e;
  }
}

/** Coche/décoche une pièce du dossier administratif d'une inscription. */
export async function togglePieceRecue(
  inscriptionId: string,
  piece: string,
  recue: boolean,
): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };

  const insc = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    select: { piecesRecues: true, candidatId: true },
  });
  if (!insc) return { ok: false };

  const set = new Set(insc.piecesRecues);
  if (recue) set.add(piece);
  else set.delete(piece);

  await prisma.inscription.update({
    where: { id: inscriptionId },
    data: { piecesRecues: [...set] },
  });

  revalidatePath(`/candidats/${insc.candidatId}`);
  return { ok: true };
}

export async function deleteInscriptionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id"));
  const sessionId = String(formData.get("sessionId"));
  const candidatId = String(formData.get("candidatId"));

  await prisma.inscription.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entityType: "Inscription",
      entityId: id,
    },
  });

  if (sessionId) revalidatePath(`/sessions/${sessionId}`);
  if (candidatId) revalidatePath(`/candidats/${candidatId}`);
}
