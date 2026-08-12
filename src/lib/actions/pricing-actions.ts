"use server";

import { revalidatePath } from "next/cache";
import { FormuleAbonnement } from "@prisma/client";
import { prismaBase, txWithOrg } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { PLAN_ORDER, type FormuleKey } from "@/lib/plans";
import { FEATURE_KEYS } from "@/lib/features";

const SUPPORT_KEY = "support"; // toujours inclus dans chaque formule

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

  // Valide tout avant d'écrire quoi que ce soit.
  const parsed = PLAN_ORDER.map((key) => {
    const prix = readPrix(formData, key);
    const nom = str(formData.get(`nom_${key}`));
    const tagline = str(formData.get(`tagline_${key}`));
    const supportLevel = str(formData.get(`support_${key}`));
    // Composition : cases cochées de la matrice + support toujours inclus.
    const feats = FEATURE_KEYS.filter((fk) => formData.get(`feat_${key}_${fk}`) === "on");
    const fonctionnalites = Array.from(new Set([...feats, SUPPORT_KEY]));
    // Comptes inclus : vide ou 0 = illimité (stocké 0).
    const cRaw = String(formData.get(`comptes_${key}`) ?? "").trim();
    const cNum = Number(cRaw);
    const comptesInclus = cRaw === "" ? 0 : (Number.isFinite(cNum) && cNum >= 0 ? Math.floor(cNum) : 0);
    return { key, nom, prix, tagline, supportLevel, fonctionnalites, comptesInclus };
  });

  const invalid = parsed.find((p) => p.prix === null || !p.nom || !p.tagline || !p.supportLevel);
  if (invalid) {
    return { error: `Formule ${invalid.key} : nom, prix, accroche et niveau de support sont requis.` };
  }

  // PlanTarif = modèle global (grille éditeur, sans policy RLS) → BYPASS.
  await txWithOrg(
    "BYPASS",
    parsed.map((p) => {
      const data = {
        nom: p.nom,
        prix: p.prix as number,
        tagline: p.tagline,
        supportLevel: p.supportLevel,
        fonctionnalites: p.fonctionnalites,
        comptesInclus: p.comptesInclus,
        populaire: p.key === populaire,
      };
      return prismaBase.planTarif.upsert({
        where: { formule: p.key as FormuleAbonnement },
        create: { formule: p.key as FormuleAbonnement, ...data },
        update: data,
      });
    }),
  );

  revalidatePath("/tarifs");
  revalidatePath("/console/tarifs");
  revalidatePath("/console");
  revalidatePath("/console/organismes");
  return { ok: true };
}
