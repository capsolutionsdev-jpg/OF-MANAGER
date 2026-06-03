// Envoi d'e-mails. En l'absence de clé Brevo (BREVO_API_KEY), l'application
// fonctionne en MODE DÉMO : les e-mails sont journalisés (statut « en attente »)
// sans envoi réel.

export function emailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

export type EmailAttachment = {
  name: string;
  /** Contenu encodé en base64 (sans préfixe data:) */
  content: string;
};

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    // Mode démo : pas d'envoi réel (l'e-mail est seulement journalisé).
    return { sent: false };
  }

  try {
    const payload: Record<string, unknown> = {
      sender: {
        name: "CAP Compétences",
        email: process.env.BREVO_SENDER ?? "contact@cap-competences.fr",
      },
      to: [{ email: params.to }],
      subject: params.subject,
      textContent: params.body,
    };
    if (params.attachments && params.attachments.length > 0) {
      payload.attachment = params.attachments.map((a) => ({
        name: a.name,
        content: a.content,
      }));
    }
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    return { sent: res.ok };
  } catch {
    return { sent: false };
  }
}

/** Convertit des octets en base64 (pour pièce jointe e-mail). */
export function toBase64(data: Uint8Array): string {
  return Buffer.from(data).toString("base64");
}
