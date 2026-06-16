"use server";

import { revalidatePath } from "next/cache";
import { PaiementStatut } from "@prisma/client";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { paiementFormSchema } from "@/lib/validators/paiement";

export type PaiementState = { ok?: boolean; error?: string };

/**
 * Enregistre un règlement sur l'inscription d'un candidat et trace le
 * collaborateur qui l'a saisi. Recalcule ensuite l'état de paiement
 * (EN_ATTENTE → ACOMPTE → PAYE) selon le total encaissé vs le montant dû.
 *
 * Réservé aux profils ayant accès à la section « comptabilite » (gérant /
 * responsable formation) — appliqué via requireSection côté serveur.
 */
export async function enregistrerPaiement(
  inscriptionId: string,
  _prev: PaiementState | undefined,
  formData: FormData,
): Promise<PaiementState> {
  // Autorise + récupère l'utilisateur courant (redirige si non autorisé).
  const session = await requireSection("comptabilite");
  const userId = session?.user?.id ?? null;
  const db = await getTenantDb();

  const parsed = paiementFormSchema.safeParse({
    montant: formData.get("montant"),
    mode: formData.get("mode"),
    reference: formData.get("reference"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const { montant, mode, reference } = parsed.data;

  // Date du règlement (chaîne "AAAA-MM-JJ") — par défaut aujourd'hui.
  const dateStr = String(formData.get("date") ?? "");
  const parsedDate = dateStr ? new Date(dateStr) : new Date();
  const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const inscription = await db.inscription.findUnique({
    where: { id: inscriptionId },
    include: {
      candidat: { select: { id: true } },
      factures: { select: { montantTTC: true } },
      paiements: { select: { montant: true } },
    },
  });
  if (!inscription) return { error: "Inscription introuvable." };

  await db.paiement.create({
    data: {
      inscriptionId,
      montant,
      date,
      mode: mode && mode.trim() !== "" ? mode : null,
      reference: reference && reference.trim() !== "" ? reference : null,
      enregistreParId: userId,
    },
  });

  // Recalcule l'état de paiement à partir du total encaissé.
  const du =
    inscription.montant != null
      ? Number(inscription.montant)
      : inscription.factures.reduce((s, f) => s + Number(f.montantTTC), 0);
  const totalPaye =
    inscription.paiements.reduce((s, p) => s + Number(p.montant), 0) + montant;

  let statut: PaiementStatut;
  if (du > 0 && totalPaye + 0.005 >= du) statut = PaiementStatut.PAYE;
  else if (totalPaye > 0) statut = PaiementStatut.ACOMPTE;
  else statut = PaiementStatut.EN_ATTENTE;

  await db.inscription.update({
    where: { id: inscriptionId },
    data: {
      paiementStatut: statut,
      // Renseigne le mode de paiement de l'inscription s'il était vide.
      ...(mode && mode.trim() !== "" && !inscription.modePaiement
        ? { modePaiement: mode }
        : {}),
    },
  });

  revalidatePath("/comptabilite");
  revalidatePath(`/candidats/${inscription.candidat.id}`);
  return { ok: true };
}
