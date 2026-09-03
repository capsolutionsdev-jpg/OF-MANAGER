"use server";

import { revalidatePath } from "next/cache";
import {
  EmailStatut,
  WorkflowTrigger,
  WorkflowAction,
  InscriptionStatut,
} from "@prisma/client";
import { requireStaffTenant } from "@/lib/tenant";
import { auth } from "@/auth";
import { sendEmail, emailConfigured } from "@/lib/email";
import {
  emailShell,
  emailParagraph,
  emailBox,
  emailSignoff,
  esc,
  emailLogoSrc,
} from "@/lib/email-templates";
import { orgConfigFor } from "@/lib/org-identity";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

// Statuts d'inscription convocables : on exclut ANNULEE et SUSPENDUE — une
// convocation officielle ne doit jamais partir à un candidat annulé/suspendu.
const STATUTS_CONVOCABLES: InscriptionStatut[] = [
  InscriptionStatut.VALIDEE,
  InscriptionStatut.EN_ATTENTE,
];

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

  const { db } = await requireStaffTenant();
  const s = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      formation: true,
      inscriptions: {
        where: { statut: { in: STATUTS_CONVOCABLES } },
        include: { candidat: true },
      },
    },
  });
  if (!s)
    return { ok: false, total: 0, sent: 0, demo: true, error: "Session introuvable." };
  const org = await orgConfigFor(s.organismeId);

  const demo = !emailConfigured();
  let sent = 0;
  for (const insc of s.inscriptions) {
    const subject = `Votre convocation — ${s.formation.titre} 📅`;
    const boxInner =
      `📅 <b>Dates</b> : du ${esc(fmt(s.dateDebut))} au ${esc(fmt(s.dateFin))}` +
      (s.horaires ? `<br>🕘 <b>Horaires</b> : ${esc(s.horaires)}` : "") +
      (s.lieu ? `<br>📍 <b>Lieu</b> : ${esc(s.lieu)}` : "");
    const html = emailShell({
      organisme: org.name,
      representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
      body:
        emailParagraph(`Bonjour ${esc(insc.candidat.prenom)},`) +
        emailParagraph(
          `Vous êtes convoqué(e) à la formation <b>« ${esc(s.formation.titre)} »</b>, qui se déroulera&nbsp;:`,
        ) +
        emailBox(boxInner) +
        emailParagraph(
          `👉 Merci de vous présenter muni(e) d'une <b>pièce d'identité</b> en cours de validité.`,
        ) +
        emailSignoff("Cordialement,", org.representant),
    });
    const res = await sendEmail({ to: insc.candidat.email, subject, html });
    if (res.sent) sent++;
    await db.emailLog.create({
      data: {
        destinataire: insc.candidat.email,
        sujet: subject,
        corps: html,
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
  const { db } = await requireStaffTenant();
  const session = await auth();
  if (!session?.user) return;

  const sessionId = String(formData.get("sessionId"));
  const s = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      formation: true,
      inscriptions: {
        where: { statut: { in: STATUTS_CONVOCABLES } },
        include: { candidat: true },
      },
    },
  });
  if (!s) return;
  const org = await orgConfigFor(s.organismeId);

  for (const insc of s.inscriptions) {
    const subject = `Votre convocation — ${s.formation.titre} 📅`;
    const boxInner =
      `📅 <b>Dates</b> : du ${esc(fmt(s.dateDebut))} au ${esc(fmt(s.dateFin))}` +
      (s.horaires ? `<br>🕘 <b>Horaires</b> : ${esc(s.horaires)}` : "") +
      (s.lieu ? `<br>📍 <b>Lieu</b> : ${esc(s.lieu)}` : "");
    const html = emailShell({
      organisme: org.name,
      representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
      body:
        emailParagraph(`Bonjour ${esc(insc.candidat.prenom)},`) +
        emailParagraph(
          `Vous êtes convoqué(e) à la formation <b>« ${esc(s.formation.titre)} »</b>, qui se déroulera&nbsp;:`,
        ) +
        emailBox(boxInner) +
        emailParagraph(
          `👉 Merci de vous présenter muni(e) d'une <b>pièce d'identité</b> en cours de validité.`,
        ) +
        emailSignoff("Cordialement,", org.representant),
    });

    const res = await sendEmail({ to: insc.candidat.email, subject, html });
    await db.emailLog.create({
      data: {
        destinataire: insc.candidat.email,
        sujet: subject,
        corps: html,
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
  const { db } = await requireStaffTenant();
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
  const { db } = await requireStaffTenant();
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
