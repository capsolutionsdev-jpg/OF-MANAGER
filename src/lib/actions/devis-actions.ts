"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { FactureStatut, Prisma } from "@prisma/client";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/token";
import { devisFormSchema, type DevisFormValues } from "@/lib/validators/devis";

export type DevisResult = { ok: true; id: string } | { ok: false; error: string };

const STATUTS = new Set(Object.values(FactureStatut) as string[]);

/** Crée un devis (lignes, totaux HT/TVA/TTC, référence séquentielle par OF). */
export async function createDevis(values: DevisFormValues): Promise<DevisResult> {
  await requireSection("facturation");
  const db = await getTenantDb();

  const parsed = devisFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const v = parsed.data;
  if (!v.entrepriseId && !v.clientNom?.trim()) {
    return { ok: false, error: "Indiquez une entreprise cliente ou un nom de client." };
  }

  const montantHT = v.lignes.reduce((s, l) => s + l.quantite * l.puHT, 0);
  const montantTTC = montantHT * (1 + v.tva / 100);

  // Référence séquentielle par organisme : DEV-AAAA-NNNN
  const year = new Date().getFullYear();
  const count = await db.devis.count({ where: { reference: { startsWith: `DEV-${year}-` } } });
  const reference = `DEV-${year}-${String(count + 1).padStart(4, "0")}`;

  const d = await db.devis.create({
    data: {
      reference,
      entrepriseId: v.entrepriseId || null,
      clientNom: v.clientNom?.trim() || null,
      clientEmail: v.clientEmail?.trim() || null,
      objet: v.objet?.trim() || null,
      validUntil: v.validUntil ? new Date(v.validUntil) : null,
      montantHT,
      tva: v.tva,
      montantTTC,
      lignesJson: v.lignes as unknown as Prisma.InputJsonValue,
      statut: FactureStatut.BROUILLON,
    },
  });

  revalidatePath("/devis");
  return { ok: true, id: d.id };
}

/** Génère le lien d'acceptation/signature en ligne du devis (statut → Envoyé). */
export async function requestDevisSignature(formData: FormData) {
  await requireSection("facturation");
  const db = await getTenantDb();
  const id = String(formData.get("id"));
  const d = await db.devis.findUnique({ where: { id }, select: { acceptToken: true } });
  if (!d) return;
  const token = d.acceptToken ?? generateToken();
  await db.devis.update({
    where: { id },
    data: { acceptToken: token, statut: FactureStatut.ENVOYEE },
  });
  revalidatePath(`/devis/${id}`);
  revalidatePath("/devis");
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
      statut: FactureStatut.PAYEE,
    },
  });
  return { ok: true };
}

/** Change le statut d'un devis (Envoyé / Payé(accepté) / Annulé(refusé)). */
export async function setDevisStatut(formData: FormData) {
  await requireSection("facturation");
  const db = await getTenantDb();
  const id = String(formData.get("id"));
  const raw = String(formData.get("statut"));
  if (!STATUTS.has(raw)) return;
  await db.devis.update({ where: { id }, data: { statut: raw as FactureStatut } });
  revalidatePath("/devis");
  revalidatePath(`/devis/${id}`);
}
