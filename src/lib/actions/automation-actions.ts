"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { runAutomations } from "@/lib/automation-engine";
import { emailConfigured } from "@/lib/email";

export type RunResult = {
  ok: boolean;
  demo: boolean;
  counts: {
    convocations: number;
    attestationsEntree: number;
    satisfactions: number;
    docsFin: number;
    compteRendus: number;
    emargements: number;
  };
};

/** Déclenche manuellement les automatismes et renvoie le détail (pour le toast). */
export async function runAutomationsNow(): Promise<RunResult> {
  const session = await auth();
  if (!session?.user)
    return {
      ok: false,
      demo: true,
      counts: {
        convocations: 0,
        attestationsEntree: 0,
        satisfactions: 0,
        docsFin: 0,
        compteRendus: 0,
        emargements: 0,
      },
    };
  const counts = await runAutomations();
  revalidatePath("/automatisations");
  return { ok: true, demo: !emailConfigured(), counts };
}
