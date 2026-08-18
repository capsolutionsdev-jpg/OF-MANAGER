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

/** Valeurs par défaut des réglages d'automatismes (miroir des @default du schéma). */
export const DEFAULT_AUTOMATION_SETTINGS: Omit<AutomationSettingsData, "id"> = {
  convocationActive: true,
  convocationJMoins: 7,
  attestationEntreeActive: true,
  satisfactionActive: true,
  docsFinActive: true,
  compteRenduActive: true,
  emargementActive: true,
};

/**
 * Récupère (ou crée) les réglages d'automatismes DE L'ORGANISME donné.
 * Correctif audit : réglages cloisonnés par tenant (une ligne par organisme)
 * au lieu d'un singleton plateforme partagé par tous les OF.
 */
export async function getAutomationSettings(organismeId: string): Promise<AutomationSettingsData> {
  const s = await prisma.automationSettings.upsert({
    where: { organismeId },
    update: {},
    create: { organismeId },
  });
  return s;
}
