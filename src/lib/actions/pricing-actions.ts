"use server";

import { revalidatePath } from "next/cache";
import { FormuleAbonnement } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { PLAN_ORDER, type FormuleKey } from "@/lib/plans";

export type PricingState = { ok?: boolean; error?: string };

/** Lit un prix entier ≥ 0 depuis le formulaire (€ / mois). */
function readPrix(fd: FormData, key: FormuleKey): number | null {
  const raw = String(fd.get(`prix_${key}`) ?? "").trim().replace(",", ".");
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();

/**
 * Met à jour les tarifs des 3 formules (prix, accroche, support, mise en avant).
 * SUPERADMIN uniquement. Répercuté immédiatement sur la vitrine (/tarifs) et le
 * tableau de bord (MRR) via revalidation.
 */
export async function updatePlanTarifs(
  _prev: PricingState | undefined,
  formData: FormData,
): Promise<PricingState> {
  await requireSuperAdmin();

  const populaire = str(formData.get("populaire")); // clé de la formule mise en avant

  // Valide tous les prix avant d'écrire quoi que ce soit.
  const parsed = PLAN_ORDER.map((key) => {
    const prix = readPrix(formData, key);
    const tagline = str(formData.get(`tagline_${key}`));
    const supportLevel = str(formData.get(`support_${key}`));
    return { key, prix, tagline, supportLevel };
  });

  const invalid = parsed.find((p) => p.prix === null || !p.tagline || !p.supportLevel);
  if (invalid) {
    return { error: `Formule ${invalid.key} : prix, accroche et niveau de support sont requis.` };
  }

  await prisma.$transaction(
    parsed.map((p) => {
      const data = {
        prix: p.prix as number,
        tagline: p.tagline,
        supportLevel: p.supportLevel,
        populaire: p.key === populaire,
      };
      return prisma.planTarif.upsert({
        where: { formule: p.key as FormuleAbonnement },
        create: { formule: p.key as FormuleAbonnement, ...data },
        update: data,
      });
    }),
  );

  revalidatePath("/tarifs");
  revalidatePath("/console/tarifs");
  revalidatePath("/console");
  return { ok: true };
}
