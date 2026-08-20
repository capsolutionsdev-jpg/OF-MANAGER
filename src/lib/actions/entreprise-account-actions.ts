"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { generateToken, appBaseUrl } from "@/lib/token";
import { INVITE_TTL_DAYS } from "@/lib/entreprise-invite";
import { sendEmail } from "@/lib/email";
import { emailShell, emailParagraph, emailButton, emailHeading } from "@/lib/email-templates";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
type Res = { ok: boolean; error?: string };

/**
 * Crée l'accès d'une entreprise cliente : User (rôle ENTREPRISE) lié à
 * l'entreprise, avec un jeton d'invitation envoyé par e-mail (le client définit
 * son mot de passe via /definir-mot-de-passe/[token]).
 */
export async function createEntrepriseAccount(entrepriseId: string): Promise<Res> {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string))
    return { ok: false, error: "Non autorisé." };

  const db = await getTenantDb();
  const ent = await db.entreprise.findUnique({
    where: { id: entrepriseId },
    select: { id: true, raisonSociale: true, contactEmail: true, organismeId: true, userId: true },
  });
  if (!ent) return { ok: false, error: "Entreprise introuvable." };
  if (ent.userId) return { ok: false, error: "Un accès existe déjà pour cette entreprise." };

  const email = (ent.contactEmail ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Renseignez d'abord l'e-mail de contact de l'entreprise." };

  // User = entité GLOBALE → client BRUT prisma (cf. Global Constraints).
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "Cette adresse e-mail est déjà utilisée par un compte." };

  const inviteToken = generateToken(24);
  const inviteTokenExpiry = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  // Mot de passe temporaire aléatoire et inutilisable (le client en définira un).
  const passwordHash = await bcrypt.hash(randomBytes(24).toString("base64url"), 12);

  const user = await prisma.user.create({
    data: {
      name: ent.raisonSociale,
      email,
      passwordHash,
      role: "ENTREPRISE",
      isActive: true,
      organismeId: ent.organismeId,
      inviteToken,
      inviteTokenExpiry,
    },
    select: { id: true },
  });
  await prisma.entreprise.update({ where: { id: ent.id }, data: { userId: user.id } });

  const link = `${appBaseUrl()}/definir-mot-de-passe/${inviteToken}`;
  const html = emailShell({
    organisme: ent.raisonSociale,
    representant: "L'équipe OFManager",
    accent: "primary",
    body:
      emailHeading("Votre espace client est prêt") +
      emailParagraph("Vous pouvez désormais suivre vos formations, inscrire vos salariés et récupérer vos documents en ligne.") +
      emailButton("Définir mon mot de passe", link, "primary") +
      emailParagraph(`Ce lien est valable ${INVITE_TTL_DAYS} jours.`),
  });
  await sendEmail({ to: email, subject: "Votre accès à l'espace client", html });

  return { ok: true };
}
