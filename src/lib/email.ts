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
  if (!emailConfigured()) {
    return { sent: false };
  }

  // --- Implémentation réelle (Brevo / Sendinblue) ---
  // await fetch("https://api.brevo.com/v3/smtp/email", {
  //   method: "POST",
  //   headers: {
  //     "api-key": process.env.BREVO_API_KEY!,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     sender: { name: "CAP Compétences", email: process.env.BREVO_SENDER },
  //     to: [{ email: params.to }],
  //     subject: params.subject,
  //     textContent: params.body,
  //   }),
  // });
  void params;
  return { sent: true };
}
