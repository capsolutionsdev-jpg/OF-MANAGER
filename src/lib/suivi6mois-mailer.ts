import "server-only";
import { EmailStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailConfigured } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { orgConfigFor } from "@/lib/org-identity";
import { generateToken, appBaseUrl } from "@/lib/token";
import { buildSuivi6MoisEmailContent } from "@/lib/suivi6mois-email";

export type SendSuivi6MoisResult = { ok: boolean; sent: boolean; reason?: string; token?: string };

/**
 * Envoie l'e-mail d'enquête de suivi à 6 mois pour une inscription.
 * Partagé par le cron (envoi auto borné) et les boutons manuels (envoi / relance)
 * → un seul modèle d'e-mail. NE gère PAS le verrou d'idempotence `suivi6moisSentAt`
 * (posé par l'appelant : le cron via claimInsc, l'action manuelle avant l'appel).
 * Génère le token si absent, journalise dans EmailLog, et envoie le SMS si le canal
 * l'inclut. Retourne `sent=false` si l'e-mail est configuré mais non parti (→ l'appelant
 * peut libérer le verrou et réessayer).
 */
export async function sendSuivi6MoisEmail(
  inscriptionId: string,
  opts: { mode?: "envoi" | "relance"; canal?: "email" | "sms" | "both"; smsBody?: string } = {},
): Promise<SendSuivi6MoisResult> {
  const insc = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc) return { ok: false, sent: false, reason: "Inscription introuvable." };

  const org = await orgConfigFor(insc.organismeId);
  const s = insc.session;
  const f = s.formation;
  const to = insc.candidat.email;
  const prenom = insc.candidat.prenom;
  const relance = opts.mode === "relance";
  const canal = opts.canal ?? "email";

  // Token public persistant (généré une seule fois, réutilisé pour les relances).
  const token = insc.suivi6moisToken ?? generateToken();
  if (!insc.suivi6moisToken) {
    await prisma.inscription.update({ where: { id: insc.id }, data: { suivi6moisToken: token } });
  }
  const lien = `${appBaseUrl()}/suivi/${token}`;

  const { subject, html } = buildSuivi6MoisEmailContent({
    organisme: org.name,
    representant: org.representant,
    logoUrl: org.logoUrl,
    orgId: org.id,
    prenom,
    titreFormation: f.titre,
    lien,
    relance,
  });

  // Canal « SMS uniquement » : l'e-mail ne part pas (le SMS suit plus bas).
  const res =
    canal === "sms"
      ? { sent: true as const, reason: undefined as string | undefined }
      : await sendEmail({ to, subject, html, organismeId: insc.organismeId, manuel: relance || undefined });

  if (canal !== "sms") {
    await prisma.emailLog.create({
      data: {
        organismeId: insc.organismeId,
        destinataire: to,
        sujet: subject,
        corps: html,
        statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
        sentAt: res.sent ? new Date() : null,
        sessionId: s.id,
      },
    });
  }

  if ((canal === "sms" || canal === "both") && insc.candidat.telephone) {
    await sendSms({
      to: insc.candidat.telephone,
      body:
        opts.smsBody ||
        `${prenom}, 2 min pour nous dire où vous en êtes 6 mois après « ${f.titre} » : ${lien}`,
      organismeId: insc.organismeId,
    });
  }

  // « Envoi réussi » = e-mail parti OU e-mail non configuré (mode démo).
  const sent = canal === "sms" ? true : res.sent || !emailConfigured();
  return { ok: true, sent, reason: res.reason, token };
}
