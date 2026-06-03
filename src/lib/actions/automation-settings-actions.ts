"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function updateAutomationSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

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
