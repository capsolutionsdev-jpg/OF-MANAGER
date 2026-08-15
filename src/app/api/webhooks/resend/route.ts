import { prisma } from "@/lib/prisma";
import { logLeadEvent } from "@/lib/growth/events";
import { checkLimit, clientIp } from "@/lib/rate-limit";
import {
  parseResendEmailEvent,
  verifySvixSignature,
  EMAIL_DEDUP_WINDOW_MS,
} from "@/lib/growth/resend-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Resend (tracking e-mail) → timeline growth.
 * Dans le dashboard Resend : créer un webhook « Email opened » + « Email clicked »
 * vers `${APP_URL}/api/webhooks/resend`, et copier le secret de signature dans
 * l'env `RESEND_WEBHOOK_SECRET` (format « whsec_… »).
 *
 * Sécurité : signature Svix vérifiée si `RESEND_WEBHOOK_SECRET` est défini
 * (recommandé). Repli simple `?secret=` (comparé à `RESEND_WEBHOOK_SECRET`) pour
 * les tests manuels ; sans aucun secret configuré → mode ouvert (dev).
 * On ne journalise que si un Lead correspond à l'e-mail — sinon 200 silencieux
 * (Resend retente sur toute autre réponse).
 */
export async function POST(req: Request) {
  const rl = await checkLimit(`resend-wh:${clientIp(req)}`, { limit: 120, windowMs: 60_000 });
  if (!rl.ok) return new Response("Too Many Requests", { status: 429 });

  const raw = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const sig = req.headers.get("svix-signature");

  let authorized: boolean;
  if (secret && sig) {
    authorized = verifySvixSignature({
      secret,
      id: req.headers.get("svix-id") ?? "",
      timestamp: req.headers.get("svix-timestamp") ?? "",
      signature: sig,
      rawBody: raw,
    });
  } else if (secret) {
    // Pas de signature Svix (test manuel) → repli sur le secret en query.
    authorized = new URL(req.url).searchParams.get("secret") === secret;
  } else if (process.env.NODE_ENV === "production") {
    // Endpoint public d'écriture : sans secret configuré, on REFUSE en production
    // (fail-closed) plutôt que d'accepter des événements falsifiés (audit §3.6).
    console.warn(
      "[resend webhook] RESEND_WEBHOOK_SECRET absent en production → requêtes refusées. " +
        "Configurez le secret Svix pour activer le tracking e-mail.",
    );
    authorized = false;
  } else {
    authorized = true; // hors production uniquement → ouvert pour les tests locaux
  }
  if (!authorized) return new Response("Unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const evt = parseResendEmailEvent(body);
  if (!evt) return Response.json({ ok: true, ignored: true });

  const lead = await prisma.lead.findFirst({
    where: { email: evt.email },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!lead) return Response.json({ ok: true, ignored: true });

  const recent = await prisma.leadEvent.findFirst({
    where: { leadId: lead.id, type: evt.type, createdAt: { gt: new Date(Date.now() - EMAIL_DEDUP_WINDOW_MS) } },
    select: { id: true },
  });
  if (recent) return Response.json({ ok: true, deduped: true });

  await logLeadEvent(lead.id, evt.type, {
    titre:
      evt.type === "email_clic" && evt.link
        ? `Lien cliqué : ${evt.link}`
        : evt.subject
          ? `E-mail ouvert : ${evt.subject}`
          : undefined,
    meta: {
      provider: "resend",
      ...(evt.link ? { link: evt.link } : {}),
      ...(evt.subject ? { subject: evt.subject } : {}),
    },
  });
  return Response.json({ ok: true });
}
