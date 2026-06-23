"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { FactureStatut, Prisma } from "@prisma/client";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/token";
import { devisFormSchema, type DevisFormValues } from "@/lib/validators/devis";
import { type ActionResult, toActionError } from "@/lib/action-result";

export type DevisResult = { ok: true; id: string } | { ok: false; error: string };

const STATUTS = new Set(Object.values(FactureStatut) as string[]);

/** Crée un devis (lignes, totaux HT/TVA/TTC, référence séquentielle par OF). */
export async function createDevis(values: DevisFormValues): Promise<DevisResult> {
  const session = await requireSection("facturation");
  const db = await getTenantDb();

  const parsed = devisFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const v = parsed.data;
  if (!v.entrepriseId && !v.clientNom?.trim()) {
    return { ok: false, error: "Indiquez une entreprise cliente ou un nom de client." };
  }

  // TVA : un organisme exonéré (art. 261-4-4° du CGI) facture SANS TVA, quel que
  // soit le taux saisi → on force 0 % (la mention légale s'affiche dans le document).
  const org = await prisma.organisme.findUnique({
    where: { id: session.user.organismeId! },
    select: { assujettiTva: true },
  });
  const tva = org?.assujettiTva === false ? 0 : v.tva;

  const montantHT = v.lignes.reduce((s, l) => s + l.quantite * l.puHT, 0);
  const montantTTC = montantHT * (1 + tva / 100);
  const year = new Date().getFullYear();

  const baseData = {
    entrepriseId: v.entrepriseId || null,
    clientNom: v.clientNom?.trim() || null,
    clientEmail: v.clientEmail?.trim() || null,
    objet: v.objet?.trim() || null,
    validUntil: v.validUntil ? new Date(v.validUntil) : null,
    montantHT,
    tva,
    montantTTC,
    lignesJson: v.lignes as unknown as Prisma.InputJsonValue,
    statut: FactureStatut.BROUILLON,
  };

  // Numérotation séquentielle par organisme : DEV-AAAA-NNNN. Le comptage n'est
  // pas atomique → on retente sur collision d'unicité (P2002) en cas de créations
  // concurrentes, garanti par @@unique([organismeId, reference]).
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await db.devis.count({ where: { reference: { startsWith: `DEV-${year}-` } } });
    const reference = `DEV-${year}-${String(count + 1 + attempt).padStart(4, "0")}`;
    try {
      const d = await db.devis.create({ data: { reference, ...baseData } });
      revalidatePath("/devis");
      return { ok: true, id: d.id };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  return { ok: false, error: "Impossible d'attribuer un numéro de devis, réessayez." };
}

/** Génère le lien d'acceptation/signature en ligne du devis (statut → Envoyé). */
export async function requestDevisSignature(formData: FormData): Promise<ActionResult> {
  try {
    await requireSection("facturation");
    const db = await getTenantDb();
    const id = String(formData.get("id"));
    const d = await db.devis.findUnique({ where: { id }, select: { acceptToken: true } });
    if (!d) return { ok: false, error: "Devis introuvable." };
    const token = d.acceptToken ?? generateToken();
    await db.devis.update({
      where: { id },
      data: { acceptToken: token, statut: FactureStatut.ENVOYEE },
    });
    revalidatePath(`/devis/${id}`);
    revalidatePath("/devis");
    return { ok: true };
  } catch (e) {
    return toActionError(e); // plus d'échec muet : journalisé + message (BCK-03)
  }
}

/** Acceptation publique du devis (bon pour accord signé). Par lien tokenisé. */
export async function acceptDevis(
  token: string,
  signataire: string,
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!signataire || signataire.trim().length < 2)
    return { ok: false, error: "Indiquez votre nom complet." };
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };
  const d = await prisma.devis.findUnique({
    where: { acceptToken: token },
    select: { id: true, acceptedAt: true },
  });
  if (!d) return { ok: false, error: "Lien invalide ou expiré." };
  if (d.acceptedAt) return { ok: true }; // déjà accepté
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? null;
  await prisma.devis.update({
    where: { id: d.id },
    data: {
      acceptedAt: new Date(),
      signataire: signataire.trim(),
      signatureUrl: signatureDataUrl,
      signatureIp: ip,
      // Un devis accepté n'est PAS payé : on garde « Envoyé » et l'acceptation est
      // tracée par acceptedAt (le « payé » est réservé au cycle facture). Évite de
      // gonfler l'encaissé dans les rapports (cf. BCK-02/MOA-03).
      statut: FactureStatut.ENVOYEE,
    },
  });
  return { ok: true };
}

/** Change le statut d'un devis (Brouillon / Envoyé / Payé / Annulé…). */
export async function setDevisStatut(formData: FormData): Promise<ActionResult> {
  try {
    await requireSection("facturation");
    const db = await getTenantDb();
    const id = String(formData.get("id"));
    const raw = String(formData.get("statut"));
    if (!STATUTS.has(raw)) return { ok: false, error: "Statut invalide." };
    await db.devis.update({ where: { id }, data: { statut: raw as FactureStatut } });
    revalidatePath("/devis");
    revalidatePath(`/devis/${id}`);
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}
