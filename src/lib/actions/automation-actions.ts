"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { runAutomations } from "@/lib/automation-engine";

/** Déclenche manuellement les automatismes (bouton « Exécuter maintenant »). */
export async function runAutomationsAction() {
  const session = await auth();
  if (!session?.user) return;
  await runAutomations();
  revalidatePath("/automatisations");
}
