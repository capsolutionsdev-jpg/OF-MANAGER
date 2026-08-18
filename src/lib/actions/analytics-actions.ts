"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { recordMrrSnapshot } from "@/lib/mrr-snapshot";

/** Enregistre manuellement le snapshot MRR du mois courant (SUPERADMIN). Idempotent. */
export async function recordMrrSnapshotAction(): Promise<{ ok: boolean; mois?: string; error?: string }> {
  await requireSuperAdmin();
  try {
    const { mois } = await recordMrrSnapshot();
    revalidatePath("/console/analytics");
    return { ok: true, mois };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec." };
  }
}
