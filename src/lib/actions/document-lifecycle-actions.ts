"use server";

import { revalidatePath } from "next/cache";
import { requireStaffTenant } from "@/lib/tenant";
import {
  publierEtapeConvention,
  publierEtapeEntree,
  publierEtapeFin,
} from "@/lib/documents/publish";

export type EtapeDocuments = "convention" | "entree" | "fin";

/**
 * STAFF : publie une étape du cycle documentaire d'une convention de groupe
 * (rend les documents visibles dans l'espace client). Idempotent : ne régénère
 * pas les documents déjà publiés → une nouvelle exécution reprend là où ça s'est
 * arrêté (utile si un gros groupe approche la limite de temps serverless).
 */
export async function publierEtapeDocuments(
  conventionId: string,
  etape: EtapeDocuments,
): Promise<{ ok: boolean; error?: string; count?: number }> {
  const { session } = await requireStaffTenant();
  const by = session.user.id;

  let count = 0;
  try {
    if (etape === "convention") count = await publierEtapeConvention(conventionId, by);
    else if (etape === "entree") count = await publierEtapeEntree(conventionId, by);
    else count = await publierEtapeFin(conventionId, by);
  } catch {
    return { ok: false, error: "La publication a échoué en cours de route — réessayez pour reprendre." };
  }

  revalidatePath("/espace-entreprise/documents");
  return { ok: true, count };
}
