import { purgeExpiredCandidats } from "@/lib/rgpd-retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche planifiée : anonymise les candidats au-delà de la durée de conservation
// de leur organisme (RGPD). Protégée par CRON_SECRET (Bearer ou ?secret=).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const qsSecret = new URL(req.url).searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && qsSecret !== secret) {
      return new Response("Non autorisé", { status: 401 });
    }
  }

  const res = await purgeExpiredCandidats();
  return Response.json({ ok: true, ranAt: new Date().toISOString(), ...res });
}
