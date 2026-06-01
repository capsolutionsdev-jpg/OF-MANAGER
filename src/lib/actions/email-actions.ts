"use server";

import { revalidatePath } from "next/cache";
import {
  EmailStatut,
  WorkflowTrigger,
  WorkflowAction,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendEmail } from "@/lib/email";
import { orgConfig } from "@/lib/org-config";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

export async function sendConvocations(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const sessionId = String(formData.get("sessionId"));
  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { formation: true, inscriptions: { include: { candidat: true } } },
  });
  if (!s) return;

  for (const insc of s.inscriptions) {
    const subject = `Convocation — ${s.formation.titre}`;
    const body = `Bonjour ${insc.candidat.prenom},

Vous êtes convoqué(e) à la formation « ${s.formation.titre} » qui se déroulera du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Merci de vous présenter muni(e) d'une pièce d'identité.

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;

    const res = await sendEmail({ to: insc.candidat.email, subject, body });
    await prisma.emailLog.create({
      data: {
        destinataire: insc.candidat.email,
        sujet: subject,
        corps: body,
        statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
        sentAt: res.sent ? new Date() : null,
        sessionId,
      },
    });
  }

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/automatisations");
}

export async function createWorkflowRule(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const nom = String(formData.get("nom") ?? "").trim();
  const trigger = String(formData.get("trigger")) as WorkflowTrigger;
  const action = String(formData.get("action")) as WorkflowAction;
  const offsetDays = parseInt(String(formData.get("offsetDays") ?? "0"), 10) || 0;
  if (!nom) return;

  await prisma.workflowRule.create({
    data: { nom, trigger, action, offsetDays },
  });
  revalidatePath("/automatisations");
}

export async function toggleWorkflowRule(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id"));
  const rule = await prisma.workflowRule.findUnique({ where: { id } });
  if (rule) {
    await prisma.workflowRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });
  }
  revalidatePath("/automatisations");
}
