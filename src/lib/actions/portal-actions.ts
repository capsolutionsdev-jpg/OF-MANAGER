"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { generateToken } from "@/lib/token";

/** Génère (ou régénère) le lien d'accès à l'espace client d'une entreprise. */
export async function generatePortalLink(formData: FormData) {
  await requireSection("portail-client");
  const db = await getTenantDb();
  const id = String(formData.get("entrepriseId"));
  await db.entreprise.update({
    where: { id },
    data: { portalToken: generateToken() },
  });
  revalidatePath("/portail-client");
}

/** Désactive l'espace client (révoque le lien). */
export async function revokePortalLink(formData: FormData) {
  await requireSection("portail-client");
  const db = await getTenantDb();
  const id = String(formData.get("entrepriseId"));
  await db.entreprise.update({ where: { id }, data: { portalToken: null } });
  revalidatePath("/portail-client");
}
