"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const STAFF_ADMIN = ["ADMIN", "RESPONSABLE_FORMATION"];

export async function updateAutomationSettings(formData: FormData) {
  const session = await auth();
  // Correctif audit : réglages d'automatismes CLOISONNÉS par organisme (une ligne
  // par tenant). Réservé au personnel gestionnaire du tenant courant. Le client
  // BRUT reste utilisé avec un where explicite `organismeId` (unique) — pas de
  // getTenantDb (pas de données filles à cloisonner ici).
  if (!session?.user || !STAFF_ADMIN.includes(session.user.role as string)) return;
  const organismeId = session.user.organismeId;
  if (!organismeId) return; // SUPERADMIN (sans organisme) n'édite pas ces réglages tenant

  const bool = (k: string) => formData.get(k) === "on";
  const jmoins = parseInt(String(formData.get("convocationJMoins") ?? "7"), 10);
  const values = {
    convocationActive: bool("convocationActive"),
    convocationJMoins: Number.isNaN(jmoins) ? 7 : Math.max(0, jmoins),
    attestationEntreeActive: bool("attestationEntreeActive"),
    satisfactionActive: bool("satisfactionActive"),
    docsFinActive: bool("docsFinActive"),
    compteRenduActive: bool("compteRenduActive"),
    emargementActive: bool("emargementActive"),
  };

  await prisma.automationSettings.upsert({
    where: { organismeId },
    update: values,
    create: { organismeId, ...values },
  });

  revalidatePath("/automatisations");
}
