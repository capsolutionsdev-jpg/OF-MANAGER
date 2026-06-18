"use server";

import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export type DemoState = { ok?: boolean; error?: string; demo?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

const notifyTo = () =>
  process.env.DEMO_NOTIFY_EMAIL ||
  process.env.SUPPORT_NOTIFY_EMAIL ||
  process.env.BREVO_SENDER ||
  "";

/**
 * Demande de démo publique (site vitrine) : enregistre le prospect dans
 * OFManager (table Lead → console /console/prospects) ET notifie l'éditeur par
 * e-mail. Envoi non bloquant (mode démo si Brevo non configuré).
 */
export async function submitDemoRequest(
  _prev: DemoState | undefined,
  formData: FormData,
): Promise<DemoState> {
  const nom = s(formData, "nom");
  const organisme = s(formData, "organisme");
  const email = s(formData, "email").toLowerCase();
  const telephone = s(formData, "telephone");
  const message = s(formData, "message");
  const hebergement = s(formData, "hebergement");
  const formations = formData.getAll("formations").map(String);

  if (!nom) return { error: "Indiquez votre nom." };
  if (!EMAIL_RE.test(email)) return { error: "E-mail invalide." };

  // 1) Enregistrement du prospect dans OFManager (jamais bloquant).
  try {
    await prisma.lead.create({
      data: { nom, organisme: organisme || null, email, telephone: telephone || null, message: message || null, hebergement: hebergement || null, formations, source: "demo" },
    });
  } catch {
    /* la capture du lead ne doit pas casser la confirmation */
  }

  // 2) Notification e-mail à l'éditeur.
  const body =
    `Nouvelle demande de démo — OFManager\n\n` +
    `Nom : ${nom}\nOrganisme : ${organisme || "—"}\nE-mail : ${email}\n` +
    `Téléphone : ${telephone || "—"}\nHébergement souhaité : ${hebergement || "—"}\n` +
    `Formations concernées : ${formations.length ? formations.join(", ") : "—"}\n\nMessage :\n${message || "—"}\n`;
  let sent = false;
  const to = notifyTo();
  if (to) {
    try { sent = (await sendEmail({ to, subject: `Démo OFManager — ${organisme || nom}`, body })).sent; } catch { /* non bloquant */ }
  }
  return { ok: true, demo: !sent };
}

/**
 * Formulaire de contact public : enregistre le prospect dans OFManager (Lead)
 * pour rappel, et notifie l'éditeur par e-mail.
 */
export async function submitContact(
  _prev: DemoState | undefined,
  formData: FormData,
): Promise<DemoState> {
  const nom = s(formData, "nom");
  const organisme = s(formData, "organisme");
  const email = s(formData, "email").toLowerCase();
  const telephone = s(formData, "telephone");
  const message = s(formData, "message");

  if (!nom) return { error: "Indiquez votre nom." };
  if (!EMAIL_RE.test(email)) return { error: "E-mail invalide." };

  try {
    await prisma.lead.create({
      data: { nom, organisme: organisme || null, email, telephone: telephone || null, message: message || null, source: "contact" },
    });
  } catch {
    /* non bloquant */
  }

  const body =
    `Nouveau message de contact — OFManager\n\n` +
    `Nom : ${nom}\nOrganisme : ${organisme || "—"}\nE-mail : ${email}\nTéléphone : ${telephone || "—"}\n\nMessage :\n${message || "—"}\n`;
  let sent = false;
  const to = notifyTo();
  if (to) {
    try { sent = (await sendEmail({ to, subject: `Contact OFManager — ${nom}`, body })).sent; } catch { /* non bloquant */ }
  }
  return { ok: true, demo: !sent };
}
