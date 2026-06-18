"use server";

import { sendEmail } from "@/lib/email";

export type DemoState = { ok?: boolean; error?: string; demo?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/**
 * Demande de démo publique (site vitrine). Envoie un e-mail à l'éditeur.
 * Destinataire : DEMO_NOTIFY_EMAIL → SUPPORT_NOTIFY_EMAIL → BREVO_SENDER.
 * En l'absence de clé Brevo, l'envoi est en mode démo (non bloquant).
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

  const to =
    process.env.DEMO_NOTIFY_EMAIL ||
    process.env.SUPPORT_NOTIFY_EMAIL ||
    process.env.BREVO_SENDER ||
    "";

  const body =
    `Nouvelle demande de démo — OFManager\n\n` +
    `Nom : ${nom}\n` +
    `Organisme : ${organisme || "—"}\n` +
    `E-mail : ${email}\n` +
    `Téléphone : ${telephone || "—"}\n` +
    `Hébergement souhaité : ${hebergement || "—"}\n` +
    `Formations concernées : ${formations.length ? formations.join(", ") : "—"}\n\n` +
    `Message :\n${message || "—"}\n`;

  let sent = false;
  if (to) {
    try {
      const r = await sendEmail({ to, subject: `Démo OFManager — ${organisme || nom}`, body });
      sent = r.sent;
    } catch {
      /* l'échec d'envoi ne doit pas casser la confirmation */
    }
  }

  return { ok: true, demo: !sent };
}
