"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { CivicMention, CivicAccessStatut, CivicPaiementMethode } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { ensureCivicFactureFor } from "@/lib/civique-api";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

type StaffCtx = { organismeId: string; userId: string };

/** Garde commune : exige un membre du personnel rattaché à un organisme. */
async function requireStaff(): Promise<StaffCtx> {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  const userId = session?.user?.id;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId || !userId) {
    throw new Error("Non autorisé.");
  }
  return { organismeId, userId };
}

function genCivicToken(): string {
  return randomBytes(24).toString("base64url");
}

function accessUntil(days: number): Date {
  return new Date(Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000);
}

const VITRINE = process.env.VITRINE_URL ?? "https://capacademy.fr";
const CONNEXION_URL = `${VITRINE}/cap-language-academy/examen-civique/connexion`;

/**
 * Crée ou met à jour le tarif de la prépa civique en ligne pour une mention.
 * Prix saisi en euros (converti en centimes), remise en % (promo simple).
 * Réservé au personnel administratif du tenant courant.
 */
export async function setCivicTarif(formData: FormData) {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId) {
    throw new Error("Non autorisé.");
  }

  const mention = String(formData.get("mention") ?? "") as CivicMention;
  if (!Object.values(CivicMention).includes(mention)) {
    throw new Error("Mention invalide.");
  }
  const prixEuros = Math.max(0, Number(formData.get("prix") ?? 0));
  const remise = Math.min(Math.max(Number(formData.get("remise") ?? 0), 0), 100);
  const actif = formData.get("actif") === "on";
  const prixCents = Math.round(prixEuros * 100);

  await prisma.civicTarif.upsert({
    where: { organismeId_mention: { organismeId, mention } },
    create: { organismeId, mention, prixCents, remisePct: remise, actif },
    update: { prixCents, remisePct: remise, actif },
  });

  revalidatePath("/examen-civique");
}

const MENTION_LABEL: Record<CivicMention, string> = {
  CSP: "Carte de séjour pluriannuelle (CSP)",
  CR: "Carte de résident (CR)",
  NATURALISATION: "Naturalisation",
};

/** Envoie au candidat son code d'accès e-learning (best-effort). */
async function sendCivicAccessEmail(args: {
  organismeId: string;
  email: string;
  prenom: string;
  code: string;
  mention: CivicMention;
}) {
  const body = [
    `Bonjour ${args.prenom || ""},`.trim(),
    "",
    "Votre accès à la préparation à l'examen civique est activé.",
    `Formation : ${MENTION_LABEL[args.mention]}`,
    "",
    "Pour vous connecter :",
    `1. Rendez-vous sur ${CONNEXION_URL}`,
    `2. Onglet « Code d'accès »`,
    `3. E-mail : ${args.email}`,
    `4. Code d'accès : ${args.code}`,
    "",
    "Avancez à votre rythme : leçons, quiz et examens blancs illimités.",
    "",
    "Bonne préparation,",
    "L'équipe CAP Language Academy",
  ].join("\n");
  await sendEmail({
    to: args.email,
    subject: "Votre accès à la préparation à l'examen civique",
    body,
    organismeId: args.organismeId,
  });
}

export type CreateCivicStudentInput = {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  mention: CivicMention;
  dureeJours?: number;
  envoyerEmail?: boolean;
};

export type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/**
 * Crée (ou met à jour) manuellement un compte élève e-learning : génère le code
 * d'accès, ouvre l'accès à la mention choisie pour la durée indiquée, et envoie
 * éventuellement le code par e-mail. Si un candidat existe déjà (même e-mail dans
 * l'organisme), il est réutilisé et son accès est (ré)ouvert.
 */
export async function createCivicStudent(
  input: CreateCivicStudentInput,
): Promise<ActionResult<{ code: string; candidatId: string }>> {
  const { organismeId, userId } = await requireStaff();
  const nom = (input.nom ?? "").trim();
  const prenom = (input.prenom ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const telephone = (input.telephone ?? "").trim() || null;
  const mention = input.mention;
  const dureeJours = Math.min(Math.max(Number(input.dureeJours ?? 30), 1), 365);

  if (!prenom || !nom) return { ok: false, error: "Nom et prénom requis." };
  if (!email.includes("@")) return { ok: false, error: "Adresse e-mail invalide." };
  if (!Object.values(CivicMention).includes(mention)) {
    return { ok: false, error: "Mention invalide." };
  }

  const existing = await prisma.candidat.findFirst({
    where: { organismeId, email },
    select: { id: true, civicToken: true, civicMentions: true },
  });

  const code = existing?.civicToken ?? genCivicToken();
  const mentions = new Set<CivicMention>(existing?.civicMentions ?? []);
  mentions.add(mention);

  let candidatId: string;
  if (existing) {
    await prisma.candidat.update({
      where: { id: existing.id },
      data: {
        nom,
        prenom,
        telephone: telephone ?? undefined,
        civicToken: code,
        civicAccessUntil: accessUntil(dureeJours),
        civicAccessStatut: "ACTIF",
        civicMentions: { set: [...mentions] },
      },
    });
    candidatId = existing.id;
  } else {
    const created = await prisma.candidat.create({
      data: {
        organismeId,
        nom,
        prenom,
        email,
        telephone,
        sourceConnaissance: "Compte créé manuellement (back-office)",
        civicToken: code,
        civicAccessUntil: accessUntil(dureeJours),
        civicAccessStatut: "ACTIF",
        civicMentions: { set: [...mentions] },
        createdById: userId,
      },
      select: { id: true },
    });
    candidatId = created.id;
  }

  if (input.envoyerEmail) {
    try {
      await sendCivicAccessEmail({ organismeId, email, prenom, code, mention });
    } catch {
      /* envoi best-effort : le code reste consultable dans le back-office */
    }
  }

  revalidatePath("/examen-civique");
  return { ok: true, code, candidatId };
}

/** Active / suspend / désactive un compte élève (tenant courant). */
export async function setCivicAccessStatut(
  candidatId: string,
  statut: CivicAccessStatut,
): Promise<ActionResult> {
  const { organismeId } = await requireStaff();
  if (!Object.values(CivicAccessStatut).includes(statut)) {
    return { ok: false, error: "Statut invalide." };
  }
  const res = await prisma.candidat.updateMany({
    where: { id: candidatId, organismeId },
    data: { civicAccessStatut: statut },
  });
  if (res.count === 0) return { ok: false, error: "Compte introuvable." };
  revalidatePath("/examen-civique");
  return { ok: true };
}

/** Prolonge la date de fin d'accès (et réactive le compte). */
export async function extendCivicAccess(
  candidatId: string,
  jours: number,
): Promise<ActionResult<{ until: string }>> {
  const { organismeId } = await requireStaff();
  const until = accessUntil(Math.min(Math.max(Number(jours ?? 30), 1), 365));
  const res = await prisma.candidat.updateMany({
    where: { id: candidatId, organismeId },
    data: { civicAccessUntil: until, civicAccessStatut: "ACTIF" },
  });
  if (res.count === 0) return { ok: false, error: "Compte introuvable." };
  revalidatePath("/examen-civique");
  return { ok: true, until: until.toISOString() };
}

/** Régénère le code d'accès (invalide l'ancien immédiatement). */
export async function regenerateCivicCode(
  candidatId: string,
): Promise<ActionResult<{ code: string }>> {
  const { organismeId } = await requireStaff();
  const code = genCivicToken();
  const res = await prisma.candidat.updateMany({
    where: { id: candidatId, organismeId },
    data: { civicToken: code },
  });
  if (res.count === 0) return { ok: false, error: "Compte introuvable." };
  revalidatePath("/examen-civique");
  return { ok: true, code };
}

// ───────────────────────── Paiements & facturation ─────────────────────────

export type RecordPaymentInput = {
  candidatId: string;
  mention: CivicMention;
  montantEuros: number;
  methode: CivicPaiementMethode;
  date?: string; // ISO (défaut : maintenant)
  notes?: string;
  prolongeJours?: number; // ouverture/prolongation d'accès (défaut 30)
};

/**
 * Enregistre un paiement physique (CB au TPE, espèces, chèque, virement) pour un
 * élève existant : crée le paiement, (ré)ouvre l'accès à la mention payée, et
 * génère la facture numérotée. Renvoie le numéro de facture.
 */
export async function recordCivicPayment(
  input: RecordPaymentInput,
): Promise<ActionResult<{ paiementId: string; factureNumero: string | null }>> {
  const { organismeId, userId } = await requireStaff();
  const mention = input.mention;
  const methode = input.methode;
  const montantCents = Math.round(Math.max(0, Number(input.montantEuros ?? 0)) * 100);
  const jours = Math.min(Math.max(Number(input.prolongeJours ?? 30), 1), 365);

  if (!Object.values(CivicMention).includes(mention)) return { ok: false, error: "Mention invalide." };
  if (!Object.values(CivicPaiementMethode).includes(methode)) {
    return { ok: false, error: "Mode de paiement invalide." };
  }
  if (montantCents <= 0) return { ok: false, error: "Montant invalide." };

  const candidat = await prisma.candidat.findFirst({
    where: { id: input.candidatId, organismeId },
    select: { id: true, civicToken: true, civicMentions: true },
  });
  if (!candidat) return { ok: false, error: "Élève introuvable." };

  const mentions = new Set<CivicMention>(candidat.civicMentions ?? []);
  mentions.add(mention);

  const paiement = await prisma.civicPaiement.create({
    data: {
      organismeId,
      candidatId: candidat.id,
      mention,
      montantCents,
      methode,
      statut: "paye",
      date: input.date ? new Date(input.date) : new Date(),
      encaissePar: userId,
      notes: (input.notes ?? "").trim() || null,
    },
    select: { id: true },
  });

  // (Ré)ouverture de l'accès + code si absent.
  await prisma.candidat.update({
    where: { id: candidat.id },
    data: {
      civicToken: candidat.civicToken ?? genCivicToken(),
      civicAccessUntil: accessUntil(jours),
      civicAccessStatut: "ACTIF",
      civicMentions: { set: [...mentions] },
    },
  });

  await ensureCivicFactureFor(paiement.id).catch(() => {});
  const facture = await prisma.civicFacture.findUnique({
    where: { paiementId: paiement.id },
    select: { numero: true },
  });

  revalidatePath("/examen-civique");
  return { ok: true, paiementId: paiement.id, factureNumero: facture?.numero ?? null };
}

/** Marque un paiement comme remboursé (la facture reste, un avoir peut être émis). */
export async function refundCivicPayment(paiementId: string): Promise<ActionResult> {
  const { organismeId } = await requireStaff();
  const res = await prisma.civicPaiement.updateMany({
    where: { id: paiementId, organismeId },
    data: { statut: "rembourse" },
  });
  if (res.count === 0) return { ok: false, error: "Paiement introuvable." };
  revalidatePath("/examen-civique");
  return { ok: true };
}

/** Annule un paiement (erreur de saisie). */
export async function cancelCivicPayment(paiementId: string): Promise<ActionResult> {
  const { organismeId } = await requireStaff();
  const res = await prisma.civicPaiement.updateMany({
    where: { id: paiementId, organismeId },
    data: { statut: "annule" },
  });
  if (res.count === 0) return { ok: false, error: "Paiement introuvable." };
  revalidatePath("/examen-civique");
  return { ok: true };
}
