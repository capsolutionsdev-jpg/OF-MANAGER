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
  if (!session?.user)
    return { ok: false, demo: true, counts: ZERO_COUNTS };
  const counts = await runAutomations();
  revalidatePath("/automatisations");
  return { ok: true, demo: !emailConfigured(), counts };
}
