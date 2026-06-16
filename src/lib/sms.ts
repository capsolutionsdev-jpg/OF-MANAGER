// Envoi de SMS (module avancé). En l'absence de clé Brevo configurée pour l'OF
// (Organisme.brevoApiKey) ou globale (BREVO_API_KEY), l'application fonctionne en
// MODE DÉMO : le SMS est journalisé (statut « DEMO ») sans envoi réel.

import { prisma } from "@/lib/prisma";

type SmsSender = { name: string; apiKey: string | undefined };

/** Nom d'expéditeur SMS Brevo : alphanumérique, 11 caractères max, sans espace. */
function smsSenderName(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "");
  return (cleaned || "Formation").slice(0, 11);
}

async function resolveSmsSender(organismeId?: string | null): Promise<SmsSender> {
  const fallback: SmsSender = {
    name: smsSenderName(process.env.BREVO_SMS_SENDER ?? "CAPCompet"),
    apiKey: process.env.BREVO_API_KEY,
  };
  if (!organismeId) return fallback;
  const o = await prisma.organisme.findUnique({
    where: { id: organismeId },
    select: { nom: true, emailExpediteurNom: true, brevoApiKey: true },
  });
  if (!o) return fallback;
  return {
    name: smsSenderName(o.emailExpediteurNom || o.nom || fallback.name),
    apiKey: o.brevoApiKey || fallback.apiKey,
  };
}

export type SmsResult = { sent: boolean; demo: boolean; providerId?: string };

/** Normalise un numéro FR au format international requis par Brevo (+33…). */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0033")) return "+" + digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10) return "+33" + digits.slice(1);
  if (digits.startsWith("33")) return "+" + digits;
  return digits;
}

export async function sendSms(params: {
  to: string;
  body: string;
  organismeId?: string | null;
}): Promise<SmsResult> {
  const sender = await resolveSmsSender(params.organismeId);
  const recipient = normalizePhone(params.to);
  if (!recipient) return { sent: false, demo: true };
  if (!sender.apiKey) {
    // Mode démo : pas d'envoi réel.
    return { sent: false, demo: true };
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "api-key": sender.apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        type: "transactional",
        sender: sender.name,
        recipient,
        content: params.body,
      }),
    });
    if (!res.ok) return { sent: false, demo: false };
    const data = (await res.json().catch(() => ({}))) as { messageId?: string | number };
    return { sent: true, demo: false, providerId: data.messageId ? String(data.messageId) : undefined };
  } catch {
    return { sent: false, demo: false };
  }
}
