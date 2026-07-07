"use server";

import { revalidatePath } from "next/cache";
import { EmailStatut, JuryPaiementStatut } from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { hasStrictFeature } from "@/lib/feature-guard";
import { sendEmail, toBase64 } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import { buildDefraiementPdf } from "@/lib/documents/defraiement";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
type Result = { ok: true; id?: string } | { ok: false; error: string };

async function guard() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId) throw new Error("Non autorisé.");
  if (!(await hasStrictFeature("jurys"))) throw new Error("Module jury non activé.");
  return { organismeId };
}

const eurosToCents = (v: string | number | undefined) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

// ── Annuaire des jurés ──
export async function createJury(input: {
  nom: string; prenom: string; email?: string; telephone?: string; qualite?: string;
}): Promise<Result> {
  await guard();
  if (!input.nom.trim() || !input.prenom.trim()) return { ok: false, error: "Nom et prénom requis." };
  const db = await getTenantDb();
  const j = await db.jury.create({
    data: {
      nom: input.nom.trim(), prenom: input.prenom.trim(),
      email: input.email?.trim() || null, telephone: input.telephone?.trim() || null,
      qualite: input.qualite?.trim() || null,
    },
  });
  revalidatePath("/jurys");
  return { ok: true, id: j.id };
}

export async function toggleJuryActif(id: string): Promise<Result> {
  await guard();
  const db = await getTenantDb();
  const j = await db.jury.findFirst({ where: { id }, select: { actif: true } });
  if (!j) return { ok: false, error: "Juré introuvable." };
  await db.jury.updateMany({ where: { id }, data: { actif: !j.actif } });
  revalidatePath("/jurys");
  return { ok: true };
}

export async function deleteJury(id: string): Promise<Result> {
  await guard();
  const db = await getTenantDb();
  const r = await db.jury.deleteMany({ where: { id } });
  if (r.count === 0) return { ok: false, error: "Juré introuvable." };
  revalidatePath("/jurys");
  return { ok: true };
}

// ── Affectation d'un juré à une session ──
export async function affecterJury(input: {
  sessionId: string; juryId: string; prixEuros?: string; natureExamen?: string; dateExamen?: string;
}): Promise<Result> {
  await guard();
  if (!input.sessionId || !input.juryId) return { ok: false, error: "Session et juré requis." };
  const db = await getTenantDb();
  // Vérifie l'appartenance de la session et du juré au tenant.
  const [s, j] = await Promise.all([
    db.session.findFirst({ where: { id: input.sessionId }, select: { id: true } }),
    db.jury.findFirst({ where: { id: input.juryId }, select: { id: true } }),
  ]);
  if (!s || !j) return { ok: false, error: "Session ou juré introuvable." };
  const existing = await db.juryAffectation.findFirst({
    where: { sessionId: input.sessionId, juryId: input.juryId }, select: { id: true },
  });
  if (existing) return { ok: false, error: "Ce juré est déjà affecté à cette session." };
  const a = await db.juryAffectation.create({
    data: {
      sessionId: input.sessionId, juryId: input.juryId,
      prixCents: eurosToCents(input.prixEuros),
      natureExamen: input.natureExamen?.trim() || null,
      dateExamen: input.dateExamen ? new Date(input.dateExamen) : null,
    },
  });
  revalidatePath("/jurys");
  return { ok: true, id: a.id };
}

export async function setAffectationPrix(id: string, prixEuros: string): Promise<Result> {
  await guard();
  const db = await getTenantDb();
  const r = await db.juryAffectation.updateMany({ where: { id }, data: { prixCents: eurosToCents(prixEuros) } });
  if (r.count === 0) return { ok: false, error: "Affectation introuvable." };
  revalidatePath("/jurys");
  return { ok: true };
}

export async function setAffectationStatut(id: string, statut: JuryPaiementStatut): Promise<Result> {
  await guard();
  const db = await getTenantDb();
  const r = await db.juryAffectation.updateMany({
    where: { id },
    data: { statut, payeAt: statut === "PAYE" ? new Date() : null },
  });
  if (r.count === 0) return { ok: false, error: "Affectation introuvable." };
  revalidatePath("/jurys");
  return { ok: true };
}

export async function removeAffectation(id: string): Promise<Result> {
  await guard();
  const db = await getTenantDb();
  const r = await db.juryAffectation.deleteMany({ where: { id } });
  if (r.count === 0) return { ok: false, error: "Affectation introuvable." };
  revalidatePath("/jurys");
  return { ok: true };
}

/**
 * Génère la note de défraiement et l'envoie IMMÉDIATEMENT par e-mail au juré
 * (PDF en pièce jointe). Trace l'envoi (defraiementSentAt) + journal e-mail.
 */
export async function sendDefraiement(affectationId: string): Promise<Result> {
  const { organismeId } = await guard();
  const pdf = await buildDefraiementPdf(affectationId);
  if (!pdf) return { ok: false, error: "Affectation introuvable." };
  if (!pdf.juryEmail || !pdf.juryEmail.includes("@"))
    return { ok: false, error: "Le juré n'a pas d'adresse e-mail valide." };

  const org = await orgConfigFor(organismeId);
  const subject = `Note de défraiement — Jury d'examen — ${org.name}`;
  const body =
    `Bonjour ${pdf.juryNom},\n\n` +
    `Vous trouverez ci-joint votre note de défraiement au titre de votre participation ` +
    `au jury d'examen.\n\nCordialement,\n${org.representant} — ${org.name}`;

  const res = await sendEmail({
    to: pdf.juryEmail,
    subject,
    body,
    attachments: [{ name: pdf.filename, content: toBase64(pdf.data) }],
    organismeId,
  });
  await prisma.emailLog.create({
    data: {
      organismeId,
      destinataire: pdf.juryEmail,
      sujet: subject,
      corps: body,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
    },
  });
  await prisma.juryAffectation.updateMany({
    where: { id: affectationId, organismeId },
    data: { defraiementSentAt: new Date() },
  });
  revalidatePath("/jurys");
  if (!res.sent) return { ok: false, error: "L'e-mail n'a pas pu être envoyé (vérifiez la configuration e-mail)." };
  return { ok: true };
}
