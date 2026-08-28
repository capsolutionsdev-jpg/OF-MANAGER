import { prisma } from "@/lib/prisma";
import { TRIAL_DAYS } from "@/lib/trial";
import { runCron } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche planifiée : passe en SUSPENDU les organismes encore en ESSAI dont la
// période d'essai (createdAt + TRIAL_DAYS) est dépassée. Enveloppée par runCron
// (auth CRON_SECRET + report d'erreur structuré `cron:suspend-trials`), comme les
// 7 autres crons — Vercel Cron ne réessaie pas (audit A08-016).
export async function GET(req: Request) {
  return runCron(req, "suspend-trials", async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - TRIAL_DAYS);

    const { count } = await prisma.organisme.updateMany({
      where: { statut: "ESSAI", createdAt: { lt: cutoff } },
      data: { statut: "SUSPENDU" },
    });

    return { suspended: count };
  });
}
