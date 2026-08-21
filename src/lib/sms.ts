// Envoi de SMS (module avancé). En l'absence de clé Brevo configurée pour l'OF
// (Organisme.brevoApiKey) ou globale (BREVO_API_KEY), l'application fonctionne en
// MODE DÉMO : le SMS est journalisé (statut « DEMO ») sans envoi réel.

import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { planForOrg } from "@/lib/plans";

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
    apiKey: decryptSecret(o.brevoApiKey) || fallback.apiKey,
  };
}

export type SmsResult = { sent: boolean; demo: boolean; providerId?: string; error?: string };

/** Normalise un numéro FR au format international requis par Brevo (+33…).
 * Renvoie null si le format n'est pas reconnu ou n'est pas un E.164 plausible
 * (+ suivi de 8 à 15 chiffres) — évite d'« envoyer » vers un numéro invalide. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  let e164: string;
  if (digits.startsWith("+")) e164 = digits;
  else if (digits.startsWith("0033")) e164 = "+" + digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 10) e164 = "+33" + digits.slice(1);
  else if (digits.startsWith("33")) e164 = "+" + digits;
  else return null; // format non reconnu
  return /^\+\d{8,15}$/.test(e164) ? e164 : null;
}

/** Journalise un SMS (statut) — best-effort, ne bloque jamais l'appelant. */
async function logSms(
  params: { to: string; body: string; organismeId?: string | null; candidatId?: string | null; createdById?: string | null },
  statut: string,
  providerId?: string,
): Promise<void> {
  try {
    await prisma.smsLog.create({
      data: {
        organismeId: params.organismeId ?? null,
        destinataire: params.to,
        body: params.body,
        candidatId: params.candidatId ?? null,
        statut,
        providerId: providerId ?? null,
        createdById: params.createdById ?? null,
      },
    });
  } catch (e) {
    console.error("[sms] journalisation échouée", e);
  }
}

/** Début du mois courant (pour le décompte du quota mensuel). */
function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function sendSms(params: {
  to: string;
  body: string;
  organismeId?: string | null;
  candidatId?: string | null;
  createdById?: string | null;
}): Promise<SmsResult> {
  const organismeId = params.organismeId ?? null;
  const recipient = normalizePhone(params.to);
  // Numéro invalide → JAMAIS traité comme un succès démo : journalisé « INVALIDE ».
  if (!recipient) {
    await logSms(params, "INVALIDE");
    return { sent: false, demo: false, error: "Numéro de téléphone invalide." };
  }

  const sender = await resolveSmsSender(organismeId);
  if (!sender.apiKey) {
    await logSms({ ...params, to: recipient }, "DEMO");
    return { sent: false, demo: true };
  }

  // Quota SMS mensuel de la formule + solde prépayé (packs) en dépassement.
  if (organismeId) {
    const org = await prisma.organisme.findUnique({
      where: { id: organismeId },
      select: { maxSmsMois: true, smsSolde: true, formule: true, fonctionnalites: true },
    });
    const quota = org?.maxSmsMois ?? planForOrg(org?.formule, org?.fonctionnalites).smsMois;
    if (quota != null) {
      const used = await prisma.smsLog.count({
        where: { organismeId, statut: "ENVOYE", createdAt: { gte: monthStart() } },
      });
      if (used >= quota) {
        // Au-delà du quota mensuel : on puise dans le solde prépayé (packs).
        if ((org?.smsSolde ?? 0) > 0) {
          await prisma.organisme.update({ where: { id: organismeId }, data: { smsSolde: { decrement: 1 } } });
        } else {
          await logSms({ ...params, to: recipient }, "QUOTA");
          return { sent: false, demo: false, error: "Quota SMS mensuel atteint — créditez un pack SMS." };
        }
      }
    }
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
    if (!res.ok) {
      await logSms({ ...params, to: recipient }, "ECHEC");
      return { sent: false, demo: false, error: "Échec de l'envoi (fournisseur)." };
    }
    const data = (await res.json().catch(() => ({}))) as { messageId?: string | number };
    const providerId = data.messageId ? String(data.messageId) : undefined;
    await logSms({ ...params, to: recipient }, "ENVOYE", providerId);
    return { sent: true, demo: false, providerId };
  } catch {
    await logSms({ ...params, to: recipient }, "ECHEC");
    return { sent: false, demo: false, error: "Erreur réseau lors de l'envoi." };
  }
}
