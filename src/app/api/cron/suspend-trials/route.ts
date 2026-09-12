import { runCron } from "@/lib/cron-runner";
import { suspendExpiredTrials } from "@/lib/trial-suspend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche planifiée : passe en SUSPENDU les organismes en ESSAI expiré — SAUF ceux
// ayant un abonnement Stripe actif (A12-005, réconciliation). Enveloppée par runCron
// (auth CRON_SECRET + report d'erreur structuré). Vercel Cron ne réessaie pas (A08-016).
export async function GET(req: Request) {
  return runCron(req, "suspend-trials", () => suspendExpiredTrials());
}
