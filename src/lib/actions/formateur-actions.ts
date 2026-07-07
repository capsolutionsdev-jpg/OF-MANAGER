"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { FactureFormateurStatut, Prisma } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { storeUpload, parseDataUrl, extFromMime } from "@/lib/blob";
import {
  formateurFormSchema,
  type FormateurFormValues,
} from "@/lib/validators/formateur";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

type Res = { ok: boolean; error?: string };
const STAFF = ["ADMIN", "RESPONSABLE_FORMATION"];
const MAX_FACTURE_BYTES = 8 * 1024 * 1024;

/** Formateur connecté (via son compte utilisateur), sinon null. */
async function currentFormateur() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "FORMATEUR") return null;
  return prisma.formateur.findUnique({
    where: { userId: session.user.id },
    select: { id: true, organismeId: true },
  });
}

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);

function toData(v: FormateurFormValues) {
  const exp =
    v.experienceAnnees && v.experienceAnnees.trim() !== ""
      ? parseInt(v.experienceAnnees, 10)
      : null;
  const tarif =
    v.tarifJournalier && v.tarifJournalier.trim() !== ""
      ? Number(v.tarifJournalier.replace(",", "."))
      : null;
  return {
    nom: v.nom.trim(),
    prenom: v.prenom.trim(),
    email: clean(v.email),
    telephone: clean(v.telephone),
    specialites: clean(v.specialites),
    experienceAnnees: exp !== null && !Number.isNaN(exp) ? exp : null,
    adresse: clean(v.adresse),
    siret: clean(v.siret),
    tarifJournalier: tarif !== null && !Number.isNaN(tarif) ? tarif : null,
    academies: v.academies ?? [],
  };
}

export async function createFormateur(
  values: FormateurFormValues,
): Promise<ActionResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const parsed = formateurFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const ids = parsed.data.formationIds ?? [];
  const formateur = await db.formateur.create({
    data: { ...toData(parsed.data), formations: { connect: ids.map((fid) => ({ id: fid })) } },
  });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entityType: "Formateur",
      entityId: formateur.id,
    },
  });
  revalidatePath("/formateurs");
  return { ok: true, id: formateur.id };
}

export async function updateFormateur(
  id: string,
  values: FormateurFormValues,
): Promise<ActionResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const parsed = formateurFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const ids = parsed.data.formationIds ?? [];
  await db.formateur.update({
    where: { id },
    data: { ...toData(parsed.data), formations: { set: ids.map((fid) => ({ id: fid })) } },
  });
  revalidatePath("/formateurs");
  revalidatePath(`/formateurs/${id}`);
  return { ok: true, id };
}

/**
 * Dépôt d'une facture par le formateur depuis son espace.
 * Crée une FactureFormateur EN_ATTENTE (l'OF la traite ensuite).
 */
export async function submitFactureFormateur(input: {
  montant: number;
  sessionId?: string;
  reference?: string;
  commentaire?: string;
  fichierDataUrl?: string;
}): Promise<Res> {
  const f = await currentFormateur();
  if (!f) return { ok: false, error: "Non autorisé." };
  if (!Number.isFinite(input.montant) || input.montant <= 0)
    return { ok: false, error: "Montant invalide." };

  let fichierUrl: string | null = null;
  if (input.fichierDataUrl) {
    const parsed = parseDataUrl(input.fichierDataUrl);
    if (!parsed) return { ok: false, error: "Justificatif illisible." };
    if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(parsed.mime))
      return { ok: false, error: "Justificatif : PDF ou image uniquement." };
    if (parsed.data.byteLength > MAX_FACTURE_BYTES)
      return { ok: false, error: "Justificatif trop volumineux (max 8 Mo)." };
    fichierUrl = await storeUpload({
      data: parsed.data,
      folder: `factures-formateur/${f.id}`,
      ext: extFromMime(parsed.mime),
      contentType: parsed.mime,
    });
  }

  // La session, si fournie, doit appartenir au même organisme.
  let sessionId: string | null = null;
  if (input.sessionId) {
    const s = await prisma.session.findFirst({
      where: { id: input.sessionId, organismeId: f.organismeId },
      select: { id: true },
    });
    sessionId = s?.id ?? null;
  }

  await prisma.factureFormateur.create({
    data: {
      organismeId: f.organismeId,
      formateurId: f.id,
      sessionId,
      reference: input.reference?.trim() || null,
      montant: new Prisma.Decimal(input.montant),
      commentaire: input.commentaire?.trim() || null,
      fichierUrl,
      statut: FactureFormateurStatut.EN_ATTENTE,
    },
  });

  revalidatePath("/ma-facturation");
  return { ok: true };
}

/** Côté OF : met à jour le statut de règlement d'une facture formateur. */
export async function setFactureFormateurStatut(
  id: string,
  statut: FactureFormateurStatut,
): Promise<Res> {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string))
    return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  const exists = await db.factureFormateur.findUnique({
    where: { id },
    select: { id: true, formateurId: true },
  });
  if (!exists) return { ok: false, error: "Facture introuvable." };
  await db.factureFormateur.update({
    where: { id },
    data: { statut, paidAt: statut === FactureFormateurStatut.PAYEE ? new Date() : null },
  });
  revalidatePath(`/formateurs/${exists.formateurId}`);
  return { ok: true };
}

export type AccountState = { ok?: boolean; error?: string; id?: string };

/**
 * Crée un FORMATEUR + son compte « espace formateur » en une fois
 * (depuis Administration → Créer un compte → Formateur).
 */
export async function createFormateurWithAccount(
  _prev: AccountState | undefined,
  formData: FormData,
): Promise<AccountState> {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string))
    return { error: "Non autorisé." };

  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!prenom || !nom) return { error: "Nom et prénom requis." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail invalide." };
  if (password.length < 8) return { error: "Mot de passe : 8 caractères minimum." };

  const db = await getTenantDb();
  const tarifRaw = String(formData.get("tarifJournalier") ?? "").replace(",", ".").trim();
  const tarif = tarifRaw !== "" && Number.isFinite(Number(tarifRaw)) ? new Prisma.Decimal(Number(tarifRaw)) : null;
  const telephone = String(formData.get("telephone") ?? "").trim() || null;

  const formateur = await db.formateur.create({
    data: { prenom, nom, email, telephone, tarifJournalier: tarif, specialites: String(formData.get("specialites") ?? "").trim() || null },
    select: { id: true },
  });

  const r = await createFormateurAccess(formateur.id, password);
  if (!r.ok) return { error: r.error };

  revalidatePath("/formateurs");
  return { ok: true, id: formateur.id };
}

/**
 * Crée (ou réinitialise) l'accès « espace formateur » : crée un utilisateur
 * FORMATEUR et le lie au formateur. Réservé au gérant / responsable formation.
 */
export async function createFormateurAccess(
  formateurId: string,
  password: string,
  emailOverride?: string,
): Promise<Res> {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string))
    return { ok: false, error: "Non autorisé." };
  if (!password || password.length < 8)
    return { ok: false, error: "Mot de passe : 8 caractères minimum." };
  const db = await getTenantDb();

  const formateur = await db.formateur.findUnique({
    where: { id: formateurId },
    select: { id: true, nom: true, prenom: true, email: true, userId: true },
  });
  if (!formateur) return { ok: false, error: "Formateur introuvable." };
  const email = (emailOverride?.trim() || formateur.email || "").toLowerCase();
  if (!email) return { ok: false, error: "Aucune adresse e-mail pour ce formateur." };

  const passwordHash = await bcrypt.hash(password, 10);
  const name = `${formateur.prenom} ${formateur.nom}`.trim();

  if (formateur.userId) {
    await db.user.update({
      where: { id: formateur.userId },
      data: { passwordHash, role: "FORMATEUR", isActive: true },
    });
  } else {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      await db.user.update({
        where: { id: existing.id },
        data: { passwordHash, role: "FORMATEUR", isActive: true, name },
      });
      await db.formateur.update({ where: { id: formateurId }, data: { userId: existing.id } });
    } else {
      const user = await db.user.create({
        data: { email, name, role: "FORMATEUR", passwordHash },
      });
      await db.formateur.update({ where: { id: formateurId }, data: { userId: user.id } });
    }
  }

  revalidatePath(`/formateurs/${formateurId}`);
  return { ok: true };
}
