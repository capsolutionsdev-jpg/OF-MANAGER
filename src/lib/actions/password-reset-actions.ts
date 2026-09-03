"use server";

// Parcours « mot de passe oublié » — server actions (flux NON authentifié).
//
// Sécurité (max) :
//  - anti-énumération : réponse NEUTRE unique, qu'un compte existe ou non ;
//  - jeton à 256 bits, stocké HACHÉ (SHA-256) en base, TTL 60 min, usage unique ;
//  - rate-limiting par e-mail ET par IP sur les deux étapes ;
//  - même porte que le login (compte actif + organisme non suspendu) ;
//  - refus des mots de passe réutilisés ou présents dans une fuite connue (HIBP) ;
//  - invalidation de la session active à la réinitialisation (déconnexion des
//    appareils déjà connectés, utile si le compte était compromis).
//
// User étant une entité GLOBALE (e-mail unique, pas de tenant en contexte public),
// on utilise le client BRUT `prisma` — comme entreprise-account-actions.ts.

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/token";
import { checkLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { isPasswordPwned } from "@/lib/security/password";
import {
  generateResetToken,
  hashResetToken,
  resetTokenExpired,
  resetEligible,
  normalizeEmail,
  RESET_TTL_MINUTES,
} from "@/lib/security/password-reset";
import { sendEmail } from "@/lib/email";
import {
  emailShell,
  emailHeading,
  emailParagraph,
  emailButton,
  emailLogoSrc,
  esc,
} from "@/lib/email-templates";

// Message NEUTRE unique (anti-énumération) : ne révèle jamais si un compte existe.
const NEUTRAL =
  "Si un compte est associé à cette adresse, un e-mail contenant les instructions de réinitialisation vient d'être envoyé. Pensez à vérifier vos courriers indésirables.";

// Message générique d'échec de consommation (ne distingue pas invalide / expiré /
// déjà utilisé — pas de signal exploitable sur l'état d'un jeton).
const INVALID_LINK =
  "Ce lien est invalide ou a expiré. Merci de refaire une demande de réinitialisation.";

// Rate-limits (fenêtre 15 min) — plus stricts que le login : action sensible qui
// déclenche un envoi d'e-mail réel.
const REQ_WINDOW_MS = 15 * 60_000;
const REQ_MAX_PER_EMAIL = 3; // 3 demandes / e-mail / 15 min
const REQ_MAX_PER_IP = 10; // 10 demandes / IP / 15 min
const CONFIRM_WINDOW_MS = 15 * 60_000;
const CONFIRM_MAX_PER_IP = 20; // 20 tentatives de consommation / IP / 15 min

export type RequestResetState = { done?: boolean; message?: string };

const emailSchema = z.string().email();

/**
 * Étape 1 — Demande de réinitialisation. Toujours une réponse NEUTRE (le message
 * est identique que l'e-mail existe, soit inconnu, soit rate-limité).
 */
export async function requestPasswordReset(
  _prev: RequestResetState | undefined,
  formData: FormData,
): Promise<RequestResetState> {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { done: true, message: NEUTRAL };

  const email = normalizeEmail(parsed.data);
  const ip = clientIpFromHeaders(await headers()) ?? "unknown";

  const [byEmail, byIp] = await Promise.all([
    checkLimit(`pwreset-req-id:${email}`, { limit: REQ_MAX_PER_EMAIL, windowMs: REQ_WINDOW_MS }),
    checkLimit(`pwreset-req-ip:${ip}`, { limit: REQ_MAX_PER_IP, windowMs: REQ_WINDOW_MS }),
  ]);
  if (!byEmail.ok || !byIp.ok) return { done: true, message: NEUTRAL };

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      organismeId: true,
      organisme: {
        select: { statut: true, nom: true, representant: true, logoUrl: true },
      },
    },
  });

  if (user && resetEligible({ isActive: user.isActive, organismeStatut: user.organisme?.statut })) {
    const { token, tokenHash, expiry } = generateResetToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: tokenHash, resetTokenExpiry: expiry },
    });

    const link = `${appBaseUrl()}/reinitialisation/${token}`;
    const html = emailShell({
      organisme: user.organisme?.nom ?? "OFManager",
      representant: user.organisme?.representant ?? "L'équipe OFManager",
      accent: "primary",
      logoUrl: emailLogoSrc(user.organismeId, user.organisme?.logoUrl),
      body:
        emailHeading("Réinitialisation de votre mot de passe") +
        emailParagraph(`Bonjour ${esc(user.name)},`) +
        emailParagraph(
          "Vous avez demandé à réinitialiser le mot de passe de votre espace. " +
            "Cliquez sur le bouton ci-dessous pour en choisir un nouveau.",
        ) +
        emailButton("Réinitialiser mon mot de passe", link, "primary") +
        emailParagraph(
          `Ce lien est valable <b>${RESET_TTL_MINUTES} minutes</b> et ne peut servir qu'une seule fois.`,
        ) +
        emailParagraph(
          "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail : " +
            "votre mot de passe reste inchangé.",
        ),
    });
    await sendEmail({
      to: user.email,
      subject: "Réinitialisation de votre mot de passe",
      html,
      organismeId: user.organismeId,
    });

    // Journalisation best-effort (le journal ne doit jamais bloquer le parcours).
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organismeId: user.organismeId,
          action: "PASSWORD_RESET_REQUEST",
          entityType: "User",
          entityId: user.id,
        },
      });
    } catch (e) {
      console.error("[requestPasswordReset] audit log failed", e);
    }
  }

  return { done: true, message: NEUTRAL };
}

export type ConfirmResetState = { ok: boolean; error?: string };

const confirmSchema = z
  .object({
    next: z
      .string()
      .min(8, "Le mot de passe doit faire au moins 8 caractères.")
      .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre.")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre."),
    confirm: z.string().min(1, "Confirmation requise."),
  })
  .refine((d) => d.next === d.confirm, {
    message: "La confirmation ne correspond pas au nouveau mot de passe.",
    path: ["confirm"],
  });

/**
 * Étape 2 — Consommation du lien : le porteur d'un jeton valide définit un
 * nouveau mot de passe. Jeton à usage unique (effacé), session active invalidée.
 */
export async function confirmPasswordReset(
  token: string,
  next: string,
  confirm: string,
): Promise<ConfirmResetState> {
  const ip = clientIpFromHeaders(await headers()) ?? "unknown";
  const byIp = await checkLimit(`pwreset-confirm-ip:${ip}`, {
    limit: CONFIRM_MAX_PER_IP,
    windowMs: CONFIRM_WINDOW_MS,
  });
  if (!byIp.ok) return { ok: false, error: "Trop de tentatives. Réessayez dans quelques minutes." };

  const parsed = confirmSchema.safeParse({ next, confirm });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Champs invalides." };

  if (!token || token.length < 20) return { ok: false, error: INVALID_LINK };

  const user = await prisma.user.findUnique({
    where: { resetTokenHash: hashResetToken(token) },
    select: {
      id: true,
      passwordHash: true,
      resetTokenExpiry: true,
      isActive: true,
      organismeId: true,
      organisme: { select: { statut: true } },
    },
  });

  if (!user || resetTokenExpired(user.resetTokenExpiry)) {
    // Jeton présent mais expiré → on le purge (nettoyage, usage unique).
    if (user) {
      await prisma.user
        .update({ where: { id: user.id }, data: { resetTokenHash: null, resetTokenExpiry: null } })
        .catch(() => {});
    }
    return { ok: false, error: INVALID_LINK };
  }

  // Même porte que le login : compte actif + organisme non suspendu.
  if (!resetEligible({ isActive: user.isActive, organismeStatut: user.organisme?.statut })) {
    return { ok: false, error: INVALID_LINK };
  }

  if (await bcrypt.compare(parsed.data.next, user.passwordHash)) {
    return { ok: false, error: "Choisissez un mot de passe différent de l'ancien." };
  }
  if (await isPasswordPwned(parsed.data.next)) {
    return {
      ok: false,
      error: "Ce mot de passe figure dans une fuite de données connue — choisissez-en un autre.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.next, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiry: null,
      mustChangePassword: false,
      // Sécurité max : invalide toute session active (les appareils déjà connectés
      // sont déconnectés à leur prochaine navigation).
      activeSessionId: null,
    },
  });

  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organismeId: user.organismeId,
        action: "PASSWORD_RESET",
        entityType: "User",
        entityId: user.id,
      },
    });
  } catch (e) {
    console.error("[confirmPasswordReset] audit log failed", e);
  }

  return { ok: true };
}
