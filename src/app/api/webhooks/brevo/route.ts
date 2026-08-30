import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logLeadEvent } from "@/lib/growth/events";
import { checkLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Brevo (événements e-mail marketing/transactionnel) → timeline growth.
 * Configurer côté Brevo : Webhooks → événements « Ouvert » et « Cliqué » vers
 * `${APP_URL}/api/webhooks/brevo?secret=${BREVO_WEBHOOK_SECRET}`.
 *
 * Sécurité : si BREVO_WEBHOOK_SECRET est défini, le paramètre `secret` doit
 * correspondre (même convention que LEAD_API_SECRET : non défini = mode ouvert).
 * On ne journalise que si un Lead correspond à l'e-mail — sinon 200 silencieux
 * (Brevo retente sur toute autre réponse).
 */

// Événements Brevo → type de LeadEvent. Les autres (delivered, bounce…) sont ignorés.
const EVENT_MAP: Record<string, "email_ouvert" | "email_clic"> = {
  opened: "email_ouvert",
  unique_opened: "email_ouvert",
  proxy_open: "email_ouvert",
  click: "email_clic",
};

// Anti-inflation du score : un même type d'événement n'est compté qu'une fois
// par lead par 24 h (un prospect qui rouvre 15 fois ≠ 15 signaux).
const DEDUP_WINDOW_MS = 24 * 60 * 60_000;

export async function POST(req: Request) {
  const rl = await checkLimit(`brevo-wh:${clientIp(req)}`, { limit: 120, windowMs: 60_000 });
  if (!rl.ok) return new Response("Too Many Requests", { status: 429 });

  const secret = process.env.BREVO_WEBHOOK_SECRET;
  if (secret) {
    // Comparaison à temps constant (audit SEC-048 / F-13) — cf. patron Wedof.
    const provided = Buffer.from(new URL(req.url).searchParams.get("secret") ?? "");
    const expected = Buffer.from(secret);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return new Response("Unauthorized", { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Endpoint public d'écriture : sans secret configuré, on REFUSE en production
    // (fail-closed) plutôt que d'accepter des événements falsifiés (audit §3.6).
    console.warn(
      "[brevo webhook] BREVO_WEBHOOK_SECRET absent en production → requêtes refusées. " +
        "Ajoutez ?secret=… (BREVO_WEBHOOK_SECRET) à l'URL du webhook Brevo.",
    );
    return new Response("Unauthorized", { status: 401 });
  }
  // Hors production sans secret → ouvert pour les tests locaux.

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const type = EVENT_MAP[String(body.event ?? "").toLowerCase()];
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!type || !email) return Response.json({ ok: true, ignored: true });

  const lead = await prisma.lead.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!lead) return Response.json({ ok: true, ignored: true });

  const recent = await prisma.leadEvent.findFirst({
    where: { leadId: lead.id, type, createdAt: { gt: new Date(Date.now() - DEDUP_WINDOW_MS) } },
    select: { id: true },
  });
  if (recent) return Response.json({ ok: true, deduped: true });

  const link = String(body.link ?? "").slice(0, 300);
  const subject = String(body.subject ?? "").slice(0, 200);
  await logLeadEvent(lead.id, type, {
    titre: type === "email_clic" && link ? `Lien cliqué : ${link}` : subject ? `E-mail ouvert : ${subject}` : undefined,
    meta: { event: String(body.event ?? ""), ...(link ? { link } : {}), ...(subject ? { subject } : {}) },
  });
  return Response.json({ ok: true });
}
