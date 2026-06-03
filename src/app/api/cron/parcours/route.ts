import { runAutomations } from "@/lib/automation-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche planifiée quotidienne (Vercel Cron).
// Protégée par CRON_SECRET : Vercel envoie `Authorization: Bearer <CRON_SECRET>`.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const url = new URL(req.url);
    const qsSecret = url.searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && qsSecret !== secret) {
      return new Response("Non autorisé", { status: 401 });
    }
  }

  const counts = await runAutomations();
  return Response.json({ ok: true, ranAt: new Date().toISOString(), counts });
}
