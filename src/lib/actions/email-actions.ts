"use server";

import { revalidatePath } from "next/cache";
import {
  EmailStatut,
  WorkflowTrigger,
  WorkflowAction,
} from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { sendEmail, emailConfigured } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

/**
 * Envoie les convocations d'une session et RENVOIE un résultat
 * (pour afficher un retour à l'utilisateur).
 */
export async function sendConvocationsForSession(
  sessionId: string,
): Promise<{ ok: boolean; total: number; sent: number; demo: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user)
    return { ok: false, total: 0, sent: 0, demo: true, error: "Non autorisé." };

  const db = await getTenantDb();
  const s = await db.session.findUnique({
    where: { id: sessionId },
    include: { formation: true, inscriptions: { include: { candidat: true } } },
  });
  if (!s)
    return { ok: false, total: 0, sent: 0, demo: true, error: "Session introuvable." };
  const org = await orgConfigFor(s.organismeId);

  const demo = !emailConfigured();
  let sent = 0;
  for (const insc of s.inscriptions) {
    const subject = `Convocation — ${s.formation.titre}`;
    const body = `Bonjour ${insc.candidat.prenom},

Vous êtes convoqué(e) à la formation « ${s.formation.titre} » qui se déroulera du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Merci de vous présenter muni(e) d'une pièce d'identité.

Cordialement,
${org.representant} — ${org.name}`;
    const res = await sendEmail({ to: insc.candidat.email, subject, body });
    if (res.sent) sent++;
    await db.emailLog.create({
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
  return { ok: true, total: s.inscriptions.length, sent, demo };
}

export async function sendConvocations(formData: FormData) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const sessionId = String(formData.get("sessionId"));
  const s = await db.session.findUnique({
    where: { id: sessionId },
    include: { formation: true, inscriptions: { include: { candidat: true } } },
  });
  if (!s) return;
  const org = await orgConfigFor(s.organismeId);

  for (const insc of s.inscriptions) {
    const subject = `Convocation — ${s.formation.titre}`;
    const body = `Bonjour ${insc.candidat.prenom},

Vous êtes convoqué(e) à la formation « ${s.formation.titre} » qui se déroulera du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Merci de vous présenter muni(e) d'une pièce d'identité.

Cordialement,
${org.representant} — ${org.name}`;

    const res = await sendEmail({ to: insc.candidat.email, subject, body });
    await db.emailLog.create({
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
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const nom = String(formData.get("nom") ?? "").trim();
  const trigger = String(formData.get("trigger")) as WorkflowTrigger;
  const action = String(formData.get("action")) as WorkflowAction;
  const offsetDays = parseInt(String(formData.get("offsetDays") ?? "0"), 10) || 0;
  if (!nom) return;

  await db.workflowRule.create({
    data: { nom, trigger, action, offsetDays },
  });
  revalidatePath("/automatisations");
}

export async function toggleWorkflowRule(formData: FormData) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id"));
  const rule = await db.workflowRule.findUnique({ where: { id } });
  if (rule) {
    await db.workflowRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });
  }
  revalidatePath("/automatisations");
}
