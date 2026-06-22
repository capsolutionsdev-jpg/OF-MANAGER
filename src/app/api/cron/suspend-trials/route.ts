import { prisma } from "@/lib/prisma";
import { TRIAL_DAYS } from "@/lib/trial";
import { assertCronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche planifiée : passe en SUSPENDU les organismes encore en ESSAI dont la
// période d'essai (createdAt + TRIAL_DAYS) est dépassée. Protégée par CRON_SECRET (obligatoire).
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TRIAL_DAYS);

  const { count } = await prisma.organisme.updateMany({
    where: { statut: "ESSAI", createdAt: { lt: cutoff } },
    data: { statut: "SUSPENDU" },
  });

  return Response.json({ ok: true, ranAt: new Date().toISOString(), suspended: count });
}
