"use server";

import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { logLeadEvent } from "@/lib/growth/events";

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
    const lead = await prisma.lead.create({
      data: { nom, organisme: organisme || null, email, telephone: telephone || null, message: message || null, hebergement: hebergement || null, formations, source: "demo" },
      select: { id: true },
    });
    await logLeadEvent(lead.id, "creation", { meta: { source: "demo" } });
    await logLeadEvent(lead.id, "demo_demandee");
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
    const lead = await prisma.lead.create({
      data: { nom, organisme: organisme || null, email, telephone: telephone || null, message: message || null, source: "contact" },
      select: { id: true },
    });
    await logLeadEvent(lead.id, "creation", { meta: { source: "contact" } });
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

/**
 * Questionnaire de qualification public (page d'atterrissage) : enregistre un
 * prospect DÉJÀ QUALIFIÉ (verticale, outil actuel, volume, échéance Qualiopi,
 * enjeu) + créneau de rappel souhaité. Le scoring « 3 chaud » se calcule ensuite
 * côté console. Notifie l'éditeur.
 */
export async function submitQualification(
  _prev: DemoState | undefined,
  formData: FormData,
): Promise<DemoState> {
  const nom = s(formData, "nom");
  const organisme = s(formData, "organisme");
  const email = s(formData, "email").toLowerCase();
  const telephone = s(formData, "telephone");
  const verticale = s(formData, "verticale") || null;
  const outilActuel = s(formData, "outilActuel") || null;
  const echeanceQualiopi = s(formData, "echeanceQualiopi") || null;
  const volumeStr = s(formData, "volume").replace(/[^\d]/g, "");
  const volumeStagiairesMois = volumeStr ? parseInt(volumeStr, 10) || null : null;
  const remplit = s(formData, "remplit");
  const malARemplir = remplit === "oui" ? true : remplit === "non" ? false : null;
  const rappel = s(formData, "rappel");
  const message = s(formData, "message");

  if (!nom) return { error: "Indiquez votre nom." };
  if (!EMAIL_RE.test(email)) return { error: "E-mail invalide." };

  const note = [rappel && `Rappel souhaité : ${rappel}`, message].filter(Boolean).join("\n") || null;

  try {
    const lead = await prisma.lead.create({
      data: {
        nom,
        organisme: organisme || null,
        email,
        telephone: telephone || null,
        source: "qualification",
        verticale,
        outilActuel,
        echeanceQualiopi,
        volumeStagiairesMois,
        malARemplir,
        notes: note,
        message: message || null,
      },
      select: { id: true },
    });
    await logLeadEvent(lead.id, "creation", { meta: { source: "qualification" } });
    await logLeadEvent(lead.id, "demo_demandee"); // intention forte
  } catch {
    /* non bloquant */
  }

  const body =
    `Nouveau prospect QUALIFIÉ — OFManager\n\n` +
    `Nom : ${nom}\nOrganisme : ${organisme || "—"}\nE-mail : ${email}\nTéléphone : ${telephone || "—"}\n` +
    `Verticale : ${verticale || "—"}\nOutil actuel : ${outilActuel || "—"}\n` +
    `Volume : ${volumeStagiairesMois ?? "—"} stagiaires/mois\nÉchéance Qualiopi : ${echeanceQualiopi || "—"}\n` +
    `Remplit ses sessions : ${malARemplir === true ? "a du mal" : malARemplir === false ? "carnet plein" : "—"}\n` +
    `Rappel souhaité : ${rappel || "—"}\n\nMessage :\n${message || "—"}\n`;
  let sent = false;
  const to = notifyTo();
  if (to) {
    try { sent = (await sendEmail({ to, subject: `Prospect qualifié — ${organisme || nom}`, body })).sent; } catch { /* non bloquant */ }
  }
  return { ok: true, demo: !sent };
}
