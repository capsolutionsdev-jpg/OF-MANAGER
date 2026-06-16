"use server";

import { revalidatePath } from "next/cache";
import { DataRequestType, DataRequestStatut } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";

export async function createDataRequest(formData: FormData) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const subjectEmail = String(formData.get("subjectEmail") ?? "").trim();
  const type = String(formData.get("type")) as DataRequestType;
  if (!subjectEmail) return;

  await db.dataRequest.create({ data: { subjectEmail, type } });
  revalidatePath("/rgpd");
}

export async function processDataRequest(formData: FormData) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id"));
  await db.dataRequest.update({
    where: { id },
    data: {
      statut: DataRequestStatut.TRAITEE,
      processedAt: new Date(),
      processedById: session.user.id,
    },
  });
  revalidatePath("/rgpd");
}

// Anonymisation (droit à l'effacement) : on conserve les enregistrements liés
// (obligations Qualiopi/comptables) mais on efface les données personnelles.
export async function anonymiseCandidat(formData: FormData) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const candidatId = String(formData.get("candidatId"));
  const c = await db.candidat.findUnique({ where: { id: candidatId } });
  if (!c) return;

  await db.candidat.update({
    where: { id: candidatId },
    data: {
      nom: "Anonymisé",
      prenom: "—",
      email: `anonymise-${candidatId}@rgpd.local`,
      telephone: null,
      adresse: null,
      ville: null,
      codePostal: null,
      dateNaissance: null,
      situationPro: null,
      employeur: null,
      posteOccupe: null,
      statut: "ARCHIVE",
    },
  });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "ANONYMISATION_RGPD",
      entityType: "Candidat",
      entityId: candidatId,
    },
  });

  revalidatePath("/candidats");
  revalidatePath(`/candidats/${candidatId}`);
  revalidatePath("/rgpd");
}
