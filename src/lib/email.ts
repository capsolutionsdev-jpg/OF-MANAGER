// Envoi d'e-mails. En l'absence de clé Brevo (BREVO_API_KEY), l'application
// fonctionne en MODE DÉMO : les e-mails sont journalisés (statut « en attente »)
// sans envoi réel.

export function emailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    // Mode démo : pas d'envoi réel (l'e-mail est seulement journalisé).
    return { sent: false };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "CAP Compétences",
          email: process.env.BREVO_SENDER ?? "contact@cap-competences.fr",
        },
        to: [{ email: params.to }],
        subject: params.subject,
        textContent: params.body,
      }),
    });
    return { sent: res.ok };
  } catch {
    return { sent: false };
  }
}
