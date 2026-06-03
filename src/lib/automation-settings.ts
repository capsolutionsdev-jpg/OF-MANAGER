import { prisma } from "@/lib/prisma";

export type AutomationSettingsData = {
  id: string;
  convocationActive: boolean;
  convocationJMoins: number;
  attestationEntreeActive: boolean;
  satisfactionActive: boolean;
  docsFinActive: boolean;
  compteRenduActive: boolean;
  emargementActive: boolean;
};

/** Récupère (ou crée) la ligne unique de réglages des automatismes. */
export async function getAutomationSettings(): Promise<AutomationSettingsData> {
  const s = await prisma.automationSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return s;
}
