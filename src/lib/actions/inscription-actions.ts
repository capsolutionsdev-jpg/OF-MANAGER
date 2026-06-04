"use server";

import { revalidatePath } from "next/cache";
import { Prisma, InscriptionStatut, PaiementStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  inscriptionFormSchema,
  type InscriptionFormValues,
} from "@/lib/validators/inscription";
import { startParcours } from "@/lib/actions/parcours-actions";
import { sendEmail } from "@/lib/email";
import { orgConfig } from "@/lib/org-config";
import { generateToken, appBaseUrl } from "@/lib/token";

export type ActionResult =
  | { ok: true; inscriptionId: string }
  | { ok: false; error: string };

export type SimpleResult = { ok: boolean; error?: string };

/**
 * Change le statut d'une inscription (Confirmer / Suspendre / Annuler).
 * Confirmer (VALIDEE) garantit le dossier apprenant, passe le candidat à
 * INSCRIT et démarre le parcours automatisé s'il ne l'est pas déjà.
 */
export async function setInscriptionStatut(
  inscriptionId: string,
  statut: InscriptionStatut,
): Promise<SimpleResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const insc = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    select: {
      id: true,
      candidatId: true,
      sessionId: true,
      apprenantId: true,
      accessToken: true,
    },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  await prisma.inscription.update({
    where: { id: inscriptionId },
    data: { statut },
  });

  if (statut === "VALIDEE") {
    const apprenant = await prisma.apprenant.upsert({
      where: { candidatId: insc.candidatId },
      update: {},
      create: { candidatId: insc.candidatId },
    });
    if (!insc.apprenantId) {
      await prisma.inscription.update({
        where: { id: inscriptionId },
        data: { apprenantId: apprenant.id },
      });
    }
    await prisma.candidat.update({
      where: { id: insc.candidatId },
      data: { statut: "INSCRIT" },
    });
    // Démarre le parcours automatisé seulement s'il n'a jamais été lancé.
    if (!insc.accessToken) await startParcours(inscriptionId);
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: `INSCRIPTION_${statut}`,
      entityType: "Inscription",
      entityId: inscriptionId,
    },
  });

  revalidatePath(`/sessions/${insc.sessionId}`);
  revalidatePath(`/candidats/${insc.candidatId}`);
  return { ok: true };
}

/** Met à jour le mode et l'état de paiement d'une inscription. */
export async function setInscriptionPaiement(
  inscriptionId: string,
  modePaiement: string | null,
  paiementStatut: PaiementStatut,
): Promise<SimpleResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const insc = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    select: { sessionId: true, candidatId: true },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  await prisma.inscription.update({
    where: { id: inscriptionId },
    data: {
      modePaiement: modePaiement && modePaiement.trim() !== "" ? modePaiement : null,
      paiementStatut,
    },
  });

  revalidatePath(`/sessions/${insc.sessionId}`);
  revalidatePath(`/candidats/${insc.candidatId}`);
  return { ok: true };
}

/**
 * Envoie (ou renvoie) manuellement l'enquête de satisfaction à un candidat,
 * indépendamment de l'automatisme de fin de session.
 */
export async function sendSatisfactionManual(
  inscriptionId: string,
): Promise<SimpleResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const insc = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  const token = insc.satisfactionToken ?? generateToken();
  if (!insc.satisfactionToken) {
    await prisma.inscription.update({
      where: { id: inscriptionId },
      data: { satisfactionToken: token },
    });
  }

  const link = `${appBaseUrl()}/satisfaction/${token}`;
  const subject = `Votre avis sur la formation « ${insc.session.formation.titre} »`;
  const body = `Bonjour ${insc.candidat.prenom} ${insc.candidat.nom},

Vous venez de suivre la formation « ${insc.session.formation.titre} ».
Merci de prendre quelques minutes pour compléter et signer ce court questionnaire de satisfaction :
${link}

Votre retour nous aide à améliorer la qualité de nos formations.

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;

  const res = await sendEmail({ to: insc.candidat.email, subject, body });

  await prisma.inscription.update({
    where: { id: inscriptionId },
    data: { satisfactionSentAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SATISFACTION_SENT",
      entityType: "Inscription",
      entityId: inscriptionId,
    },
  });

  revalidatePath(`/sessions/${insc.sessionId}`);
  return {
    ok: true,
    error: res.sent ? undefined : "E-mail non envoyé (mode démo : configurez Brevo).",
  };
}

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
