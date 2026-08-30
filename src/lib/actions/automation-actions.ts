"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { runAutomations } from "@/lib/automation-engine";
import { emailConfigured } from "@/lib/email";

type Counts = Awaited<ReturnType<typeof runAutomations>>;

export type RunResult = {
  ok: boolean;
  demo: boolean;
  counts: Counts;
};

const ZERO_COUNTS: Counts = {
  convocations: 0,
  rappels: 0,
  convocationsExamen: 0,
  attestationsEntree: 0,
  satisfactions: 0,
  docsFin: 0,
  compteRendus: 0,
  emargements: 0,
};

/** Déclenche manuellement les automatismes et renvoie le détail (pour le toast). */
export async function runAutomationsNow(): Promise<RunResult> {
  const session = await auth();
  // Réservé aux gestionnaires (déclenche le balayage des automatismes).
  if (!session?.user || !["ADMIN", "RESPONSABLE_FORMATION"].includes(session.user.role as string))
    return { ok: false, demo: true, counts: ZERO_COUNTS };
  // Cloisonnement multi-tenant (audit A05-001) : le déclenchement MANUEL ne
  // traite QUE les automatismes de l'organisme de l'utilisateur. Seul le cron
  // (api/cron/parcours) balaie l'ensemble des tenants.
  const organismeId = (session.user as { organismeId?: string | null }).organismeId ?? null;
  if (!organismeId) return { ok: false, demo: true, counts: ZERO_COUNTS };
  const counts = await runAutomations(organismeId);
  revalidatePath("/automatisations");
  return { ok: true, demo: !emailConfigured(), counts };
}
