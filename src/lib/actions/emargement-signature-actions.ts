"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { DemiJournee } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { generateToken, appBaseUrl } from "@/lib/token";
import { joursSession, dayKey } from "@/lib/emargement";
import { sendEmail } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import {
  emailShell,
  emailParagraph,
  emailButton,
  emailBox,
  emailSignoff,
  esc,
  emailLogoSrc,
} from "@/lib/email-templates";

/**
 * Prépare les lignes de signature d'émargement (jour × demi-journée × personne)
 * pour une session. Idempotent : ne crée que les combinaisons manquantes.
 */
export async function prepareEmargementSignatures(
  sessionId: string,
): Promise<{ ok: boolean; created: number; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, created: 0, error: "Non autorisé." };
  const db = await getTenantDb();

  const s = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      seances: { orderBy: { date: "asc" } },
      formateurs: true,
      inscriptions: {
        where: { statut: { not: "ANNULEE" } },
        include: { candidat: true },
      },
    },
  });
  if (!s) return { ok: false, created: 0, error: "Session introuvable." };

  const jours = joursSession(s.seances, s.dateDebut, s.dateFin);
  const demis: DemiJournee[] = [DemiJournee.MATIN, DemiJournee.APRES_MIDI];

  type Personne = { role: string; nom: string; email: string; candidatId: string | null };
  const personnes: Personne[] = [
    ...s.inscriptions.map((i) => ({
      role: "STAGIAIRE",
      nom: `${i.candidat.prenom} ${i.candidat.nom}`,
      email: i.candidat.email,
      candidatId: i.candidatId,
    })),
    ...s.formateurs
      .filter((f) => f.email)
      .map((f) => ({
        role: "FORMATEUR",
        nom: `${f.prenom} ${f.nom}`,
        email: f.email as string,
        candidatId: null,
      })),
  ];

  const existing = await db.emargementSignature.findMany({
    where: { sessionId },
    select: { email: true, role: true, date: true, demi: true },
  });
  const key = (role: string, email: string, date: Date, demi: string) =>
    `${role}|${email}|${dayKey(date)}|${demi}`;
  const seen = new Set(
    existing.map((e) => key(e.role, e.email, e.date, e.demi)),
  );

  const toCreate: {
    organismeId: string | null;
    sessionId: string;
    date: Date;
    demi: DemiJournee;
    role: string;
    nom: string;
    email: string;
    candidatId: string | null;
    token: string;
  }[] = [];

  for (const jour of jours) {
    for (const demi of demis) {
      for (const p of personnes) {
        if (seen.has(key(p.role, p.email, jour, demi))) continue;
        toCreate.push({
          organismeId: s.organismeId,
          sessionId,
          date: jour,
          demi,
          role: p.role,
          nom: p.nom,
          email: p.email,
          candidatId: p.candidatId,
          token: generateToken(),
        });
      }
    }
  }

  if (toCreate.length > 0) {
    await db.emargementSignature.createMany({ data: toCreate });
  }

  revalidatePath(`/sessions/${sessionId}/emargement`);
  return { ok: true, created: toCreate.length };
}

/**
 * Envoie (ou relance) immédiatement le lien de signature d'émargement à une
 * personne pour une demi-journée donnée. Fonctionne pour les stagiaires comme
 * pour les formateurs.
 */
export async function sendEmargementLink(
  emargementId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();

  const e = await db.emargementSignature.findUnique({
    where: { id: emargementId },
    include: { session: { include: { formation: true } } },
  });
  if (!e) return { ok: false, error: "Ligne d'émargement introuvable." };
  if (e.signedAt) return { ok: false, error: "Déjà signé." };
  const org = await orgConfigFor(e.organismeId);

  const demiLabel = e.demi === DemiJournee.MATIN ? "matin" : "après-midi";
  const jour = e.date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const link = `${appBaseUrl()}/emarger/${e.token}`;
  const subject = `✍️ Signez votre présence du ${jour} (${demiLabel}) — ${e.session.formation.titre}`;
  const html = emailShell({
    organisme: org.name,
    representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
    body:
      emailParagraph(`Bonjour ${esc(e.nom)},`) +
      emailParagraph(
        `Merci de <b>signer votre présence</b> du ${esc(jour)} (${esc(demiLabel)}) à la formation <b>« ${esc(e.session.formation.titre)} »</b>&nbsp;:`,
      ) +
      emailButton("Signer mon émargement →", link) +
      emailBox(
        `👆 Signature directe avec votre <b>doigt</b> (mobile) ou votre <b>souris</b> (ordinateur).`,
      ) +
      emailSignoff("Merci,", org.representant),
  });

  const res = await sendEmail({ to: e.email, subject, html });

  await db.emargementSignature.update({
    where: { id: emargementId },
    data: { sentAt: new Date() },
  });

  revalidatePath(`/sessions/${e.sessionId}/emargement`);
  return {
    ok: true,
    error: res.sent ? undefined : "E-mail non envoyé (mode démo : configurez Brevo).",
  };
}

/** Signature publique d'un émargement (signature manuscrite dessinée). */
export async function signEmargement(
  token: string,
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const row = await prisma.emargementSignature.findUnique({ where: { token } });
  if (!row) return { ok: false, error: "Lien invalide." };
  if (row.signedAt) return { ok: true };

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;

  await prisma.emargementSignature.update({
    where: { token },
    data: { signedAt: new Date(), signatureIp: ip, signatureDataUrl },
  });
  return { ok: true };
}
