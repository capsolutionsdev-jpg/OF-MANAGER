// Envoi d'e-mails. En l'absence de clé Brevo (BREVO_API_KEY), l'application
// fonctionne en MODE DÉMO : les e-mails sont journalisés (statut « en attente »)
// sans envoi réel.
//
// Multi-tenant : passez `organismeId` pour envoyer via le compte Brevo de l'OF
// (clé + expéditeur propres, cf. Organisme.brevoApiKey / emailExpediteur). À
// défaut, repli sur la configuration globale (variables d'environnement).

import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { getCurrentOrganisme } from "@/lib/org";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY);
}

/**
 * Vrai si l'e-mail émane d'un tenant de DÉMONSTRATION : soit l'organisme passé
 * explicitement est une démo, soit (à défaut) l'utilisateur connecté appartient à
 * une démo. Best-effort et sans échec : les contextes publics/cron (provisionnement
 * de démo, notifications éditeur…) n'ont pas de session → renvoie false → envoi normal.
 */
async function isDemoSender(organismeId?: string | null): Promise<boolean> {
  try {
    if (organismeId) {
      const o = await prisma.organisme.findUnique({
        where: { id: organismeId },
        select: { isDemo: true },
      });
      return Boolean(o?.isDemo);
    }
    const org = await getCurrentOrganisme();
    return Boolean(org?.isDemo);
  } catch {
    return false;
  }
}

export type EmailAttachment = {
  name: string;
  /** Contenu encodé en base64 (sans préfixe data:) */
  content: string;
};

type Sender = { name: string; email: string; apiKey: string | undefined };

/** Résout l'expéditeur Brevo : config de l'OF si fournie, sinon globale. */
async function resolveSender(organismeId?: string | null): Promise<Sender> {
  const fallback: Sender = {
    name: "OFManager",
    email: process.env.BREVO_SENDER ?? "contact@ofmanager.info",
    apiKey: process.env.BREVO_API_KEY,
  };
  if (!organismeId) return fallback;
  const o = await prisma.organisme.findUnique({
    where: { id: organismeId },
    select: { nom: true, emailExpediteurNom: true, emailExpediteur: true, brevoApiKey: true },
  });
  if (!o) return fallback;
  return {
    name: o.emailExpediteurNom || o.nom || fallback.name,
    email: o.emailExpediteur || fallback.email,
    apiKey: decryptSecret(o.brevoApiKey) || fallback.apiKey,
  };
}

/** Envoi via Resend (api.resend.com) — provider serverless, sans restriction IP. */
async function sendViaResend(
  params: { to: string; subject: string; body?: string; html?: string; attachments?: EmailAttachment[] },
  sender: Sender,
): Promise<{ sent: boolean; reason?: string }> {
  // RESEND_SENDER accepte 2 formats : adresse seule (« no-reply@domaine.fr ») OU
  // en-tête complet (« Nom <no-reply@domaine.fr> »). Si « < » est présent, on
  // l'utilise TEL QUEL — sinon on obtiendrait « Nom <Nom <addr>> » (invalide →
  // Resend refuse l'envoi) ; sinon on préfixe le nom de l'expéditeur.
  const rawSender = process.env.RESEND_SENDER;
  const from =
    rawSender && rawSender.includes("<")
      ? rawSender
      : `${sender.name} <${rawSender || sender.email}>`;
  const payload: Record<string, unknown> = {
    from,
    to: [params.to],
    // Reply-To = adresse de l'OF (PC-MAIL-05) : le `from` est l'expéditeur mutualisé
    // (seul domaine vérifié), mais les réponses des candidats doivent revenir à
    // l'organisme, pas à un no-reply partagé.
    reply_to: sender.email,
    subject: params.subject,
    // HTML prioritaire (e-mails candidats habillés) ; texte pour les envois legacy.
    ...(params.html ? { html: params.html } : { text: params.body ?? "" }),
  };
  if (params.attachments && params.attachments.length > 0) {
    payload.attachments = params.attachments.map((a) => ({
      filename: a.name,
      content: a.content, // base64
    }));
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) return { sent: true };
    // Échec Resend (cause fréquente : expéditeur/domaine « from » non vérifié) →
    // on remonte le message d'erreur réel de Resend pour un diagnostic clair.
    let reason = `Resend a refusé l'envoi (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string; name?: string };
      if (body?.message) reason = `Resend : ${body.message} (expéditeur : ${from})`;
      else if (body?.name) reason = `Resend : ${body.name} (expéditeur : ${from})`;
    } catch {
      /* corps non JSON : on garde le message générique */
    }
    console.error("[email] Resend refus", res.status, "from:", from, "-", reason);
    return { sent: false, reason };
  } catch (e) {
    const reason = `Resend injoignable : ${e instanceof Error ? e.message : String(e)}`;
    console.error("[email]", reason);
    return { sent: false, reason };
  }
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  /** Corps texte brut (envois legacy / non-candidat). Ignoré à l'envoi si `html` est fourni. */
  body?: string;
  /** Corps HTML (e-mails candidats habillés). Prioritaire sur `body` — envoi HTML seul. */
  html?: string;
  attachments?: EmailAttachment[];
  /** Tenant émetteur (utilise son compte Brevo si configuré). */
  organismeId?: string | null;
  /**
   * Envoi déclenché MANUELLEMENT par un collaborateur (bouton d'un écran) :
   * passe outre la suspension `emailsSuspendus`, qui ne coupe donc que les
   * envois AUTOMATIQUES (cron, déclencheurs de parcours…).
   */
  manuel?: boolean;
}): Promise<{ sent: boolean; reason?: string }> {
  // Bac à sable démo : un tenant de démonstration n'émet JAMAIS de vrai e-mail.
  // On simule un envoi réussi (expérience réaliste côté prospect) sans rien transmettre.
  if (await isDemoSender(params.organismeId)) {
    return { sent: true };
  }

  const sender = await resolveSender(params.organismeId);

  // Priorité à Resend si configuré (recommandé sur Vercel : aucune restriction IP).
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(params, sender);
  }

  if (!sender.apiKey) {
    // Aucun fournisseur configuré → « mode démo » : rien n'est envoyé.
    return {
      sent: false,
      reason:
        "Aucun fournisseur e-mail configuré (mode démo). Définissez RESEND_API_KEY et RESEND_SENDER en variables d'environnement.",
    };
  }

  try {
    const payload: Record<string, unknown> = {
      sender: { name: sender.name, email: sender.email },
      // Reply-To = adresse de l'OF (PC-MAIL-05), cohérent avec l'envoi Resend.
      replyTo: { email: sender.email, name: sender.name },
      to: [{ email: params.to }],
      subject: params.subject,
      ...(params.html ? { htmlContent: params.html } : { textContent: params.body ?? "" }),
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
        "api-key": sender.apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    return { sent: res.ok, reason: res.ok ? undefined : `Brevo a refusé l'envoi (HTTP ${res.status}).` };
  } catch {
    return { sent: false, reason: "Brevo injoignable." };
  }
}

/** Convertit des octets en base64 (pour pièce jointe e-mail). */
export function toBase64(data: Uint8Array): string {
  return Buffer.from(data).toString("base64");
}
