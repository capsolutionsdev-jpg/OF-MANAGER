"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const STAFF_ADMIN = ["ADMIN", "RESPONSABLE_FORMATION"];

export async function updateAutomationSettings(formData: FormData) {
  const session = await auth();
  // Réglages GLOBAUX (singleton "singleton", modèle plateforme) → client BRUT,
  // JAMAIS getTenantDb : un client cloisonné injecte organismeId et entre en
  // collision de clé primaire avec le singleton (invisible sous RLS → la
  // sauvegarde plantait pour chaque tenant). Réservé aux gestionnaires.
  if (!session?.user || !STAFF_ADMIN.includes(session.user.role as string)) return;

  const bool = (k: string) => formData.get(k) === "on";
  const jmoins = parseInt(String(formData.get("convocationJMoins") ?? "7"), 10);

  await prisma.automationSettings.upsert({
    where: { id: "singleton" },
    update: {
      convocationActive: bool("convocationActive"),
      convocationJMoins: Number.isNaN(jmoins) ? 7 : Math.max(0, jmoins),
      attestationEntreeActive: bool("attestationEntreeActive"),
      satisfactionActive: bool("satisfactionActive"),
      docsFinActive: bool("docsFinActive"),
      compteRenduActive: bool("compteRenduActive"),
      emargementActive: bool("emargementActive"),
    },
    create: {
      id: "singleton",
      convocationActive: bool("convocationActive"),
      convocationJMoins: Number.isNaN(jmoins) ? 7 : Math.max(0, jmoins),
      attestationEntreeActive: bool("attestationEntreeActive"),
      satisfactionActive: bool("satisfactionActive"),
      docsFinActive: bool("docsFinActive"),
      compteRenduActive: bool("compteRenduActive"),
      emargementActive: bool("emargementActive"),
    },
  });

  revalidatePath("/automatisations");
}
