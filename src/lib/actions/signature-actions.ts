"use server";

import { revalidatePath } from "next/cache";
import { SignatureProvider, SignatureStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { createYousignRequest } from "@/lib/yousign";
import { orgConfig } from "@/lib/org-config";

export async function requestDocumentSignature(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const inscriptionId = String(formData.get("inscriptionId"));
  const type = String(formData.get("type"));
  const label = String(formData.get("label"));

  const insc = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { candidat: true },
  });
  if (!insc) return;

  const fullName = `${insc.candidat.prenom} ${insc.candidat.nom}`;
  const { externalId, demo } = await createYousignRequest({
    name: `${label} — ${fullName}`,
    signers: [{ nom: fullName, email: insc.candidat.email }],
  });

  await prisma.signatureRequest.create({
    data: {
      provider: SignatureProvider.YOUSIGN,
      inscriptionId,
      statut: SignatureStatut.ENVOYEE,
      externalId,
      signataires: {
        type,
        label,
        kind: "document",
        demo,
        signers: [
          { nom: fullName, email: insc.candidat.email, role: "Stagiaire" },
          { nom: orgConfig.representant, role: "Organisme" },
        ],
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SIGNATURE_REQUEST",
      entityType: "Inscription",
      entityId: inscriptionId,
    },
  });

  revalidatePath(`/documents/${inscriptionId}/${type}`);
  revalidatePath("/signatures");
}

export async function requestEmargementSignature(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const seanceId = String(formData.get("seanceId"));
  const { externalId, demo } = await createYousignRequest({
    name: "Feuille d'émargement",
    signers: [],
  });

  await prisma.signatureRequest.create({
    data: {
      provider: SignatureProvider.YOUSIGN,
      statut: SignatureStatut.ENVOYEE,
      externalId,
      signataires: {
        type: "EMARGEMENT",
        label: "Feuille d'émargement",
        kind: "emargement",
        seanceId,
        demo,
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SIGNATURE_REQUEST",
      entityType: "Seance",
      entityId: seanceId,
    },
  });

  revalidatePath(`/emargement/${seanceId}`);
  revalidatePath("/signatures");
}

export async function markSignatureSigned(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id"));
  await prisma.signatureRequest.update({
    where: { id },
    data: { statut: SignatureStatut.SIGNEE, signedAt: new Date() },
  });

  revalidatePath("/signatures");
  const back = String(formData.get("back") ?? "");
  if (back) revalidatePath(back);
}
