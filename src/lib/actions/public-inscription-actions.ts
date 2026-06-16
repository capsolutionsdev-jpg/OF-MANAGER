"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  publicInscriptionSchema,
  type PublicInscriptionValues,
} from "@/lib/validators/public-inscription";

export type ActionResult = { ok: true } | { ok: false; error: string };

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);

export async function submitPublicInscription(
  values: PublicInscriptionValues,
): Promise<ActionResult> {
  const parsed = publicInscriptionSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Formulaire invalide." };
  const v = parsed.data;

  // La session doit exister et être ouverte aux inscriptions.
  const session = await prisma.session.findUnique({
    where: { id: v.sessionId },
    select: { id: true, organismeId: true },
  });
  if (!session) return { ok: false, error: "Session introuvable." };
  // Tenant dérivé de la session ciblée (le formulaire public n'a pas de session utilisateur).
  const orgId = session.organismeId;

  // Candidat : réutiliser s'il existe déjà (par email, dans le même organisme), sinon créer.
  let candidat = await prisma.candidat.findFirst({
    where: { email: v.email.trim(), organismeId: orgId },
  });
  if (!candidat) {
    candidat = await prisma.candidat.create({
      data: {
        organismeId: orgId,
        nom: v.nom.trim(),
        prenom: v.prenom.trim(),
        email: v.email.trim(),
        telephone: clean(v.telephone),
        dateNaissance: v.dateNaissance ? new Date(v.dateNaissance) : null,
        ville: clean(v.ville),
        codePostal: clean(v.codePostal),
        situationPro: clean(v.situationPro),
        employeur: clean(v.employeur),
        financementType: v.financementType ? v.financementType : null,
        statut: "NOUVEAU",
      },
    });
  }

  try {
    await prisma.inscription.create({
      data: {
        organismeId: orgId,
        candidatId: candidat.id,
        sessionId: v.sessionId,
        financementType: v.financementType ? v.financementType : null,
        statut: "EN_ATTENTE",
        consentementRgpd: true,
        consentementDate: new Date(),
        source: "formulaire_public",
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false,
        error: "Une demande d'inscription existe déjà pour cet email sur cette session.",
      };
    }
    throw e;
  }

  // Trace du consentement RGPD.
  await prisma.consentement.create({
    data: {
      organismeId: orgId,
      candidatId: candidat.id,
      type: "inscription_formulaire_public",
      accepte: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      organismeId: orgId,
      action: "PUBLIC_INSCRIPTION",
      entityType: "Inscription",
      entityId: candidat.id,
    },
  });

  revalidatePath(`/sessions/${v.sessionId}`);
  return { ok: true };
}
