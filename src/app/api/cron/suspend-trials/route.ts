import { prisma } from "@/lib/prisma";
import { TRIAL_DAYS } from "@/lib/trial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche planifiée : passe en SUSPENDU les organismes encore en ESSAI dont la
// période d'essai (createdAt + TRIAL_DAYS) est dépassée. Protégée par CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const qsSecret = new URL(req.url).searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && qsSecret !== secret) {
      return new Response("Non autorisé", { status: 401 });
    }
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TRIAL_DAYS);

  const { count } = await prisma.organisme.updateMany({
    where: { statut: "ESSAI", createdAt: { lt: cutoff } },
    data: { statut: "SUSPENDU" },
  });

  return Response.json({ ok: true, ranAt: new Date().toISOString(), suspended: count });
}
