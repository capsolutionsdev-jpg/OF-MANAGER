import "server-only";
import { prisma } from "@/lib/prisma";

// Durée de vie d'une démo à partir de la 1re connexion (heures). Filet à J+7 côté
// provisionnement (demoHardExpiresAt) même si l'utilisateur ne se connecte jamais.
export const DEMO_TTL_HOURS = Number(process.env.DEMO_TTL_HOURS ?? 48);

export type DemoOrgFields = {
  isDemo: boolean;
  demoFirstLoginAt: Date | null;
  demoExpiresAt: Date | null;
  demoHardExpiresAt: Date | null;
};

export type DemoState = {
  isDemo: boolean;
  started: boolean;
  expired: boolean;
  msLeft: number | null; // temps restant avant expiration (>= 0), null si non démo
};

/** État de la démo (pur, testable). `now` injectable pour les tests. */
export function computeDemoState(
  org: DemoOrgFields | null | undefined,
  now: Date = new Date(),
): DemoState {
  if (!org?.isDemo) return { isDemo: false, started: false, expired: false, msLeft: null };
  const t = now.getTime();
  const hardExpired = !!org.demoHardExpiresAt && t > org.demoHardExpiresAt.getTime();
  const softExpired = !!org.demoExpiresAt && t > org.demoExpiresAt.getTime();
  const ref = org.demoExpiresAt ?? org.demoHardExpiresAt ?? null;
  return {
    isDemo: true,
    started: !!org.demoFirstLoginAt,
    expired: hardExpired || softExpired,
    msLeft: ref ? Math.max(0, ref.getTime() - t) : null,
  };
}

/** Formate le temps restant pour l'UI (« 47 h 12 min », « 8 min »). */
export function formatDemoLeft(ms: number | null): string {
  if (ms == null) return "";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 1) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  return `${Math.max(1, m)} min`;
}

/**
 * Démarre le compteur (demoExpiresAt = now + 48 h) à la PREMIÈRE connexion.
 * Idempotent : ne fait rien si ce n'est pas une démo ou si déjà démarrée.
 * Renvoie les champs démo à jour (évite de relire l'organisme mis en cache).
 */
export async function startDemoIfNeeded(orgId: string, org: DemoOrgFields): Promise<DemoOrgFields> {
  if (!org.isDemo || org.demoFirstLoginAt) return org;
  const now = new Date();
  const demoExpiresAt = new Date(now.getTime() + DEMO_TTL_HOURS * 3_600_000);
  await prisma.organisme.update({
    where: { id: orgId },
    data: { demoFirstLoginAt: now, demoExpiresAt },
  });
  return { ...org, demoFirstLoginAt: now, demoExpiresAt };
}
