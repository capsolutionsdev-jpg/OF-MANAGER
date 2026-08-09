import { prisma } from "@/lib/prisma";
import { checkLimit } from "@/lib/rate-limit";
import { isValidEmail, isDisposableEmail } from "@/lib/demo/disposable";
import { provisionDemo, type DemoMetier } from "@/lib/demo/provision";

export const runtime = "nodejs";
export const maxDuration = 60; // le seed peut prendre quelques secondes
export const dynamic = "force-dynamic";

const METIERS: DemoMetier[] = ["securite", "vtc_taxi", "les_deux", "autre"];

function clientIp(req: Request): string {
  const h = req.headers;
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Provisionnement PUBLIC d'une démo (appelé par le formulaire du site vitrine).
 * Anti-abus : e-mail valide + non jetable, rate-limit par IP et par e-mail (3/j),
 * une seule démo active par e-mail. Ne renvoie jamais le mot de passe.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return Response.json({ ok: false, error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (isDisposableEmail(email)) {
    return Response.json({ ok: false, error: "Merci d'utiliser une adresse e-mail professionnelle." }, { status: 400 });
  }
  const metier = (METIERS.includes(body.metier as DemoMetier) ? body.metier : "autre") as DemoMetier;

  // Rate-limit (repli mémoire si Upstash absent).
  const ip = clientIp(req);
  const perIp = await checkLimit(`demo:ip:${ip}`, { limit: 3, windowMs: 24 * 60 * 60_000 });
  const perEmail = await checkLimit(`demo:email:${email}`, { limit: 3, windowMs: 24 * 60 * 60_000 });
  if (!perIp.ok || !perEmail.ok) {
    return Response.json(
      { ok: false, error: "Trop de demandes. Réessayez plus tard ou contactez-nous." },
      { status: 429 },
    );
  }

  // Une seule démo ACTIVE par e-mail : si une démo existe déjà et son tenant est
  // encore actif, on ne recrée pas (on ne peut pas renvoyer le mot de passe).
  const existing = await prisma.lead.findFirst({
    where: { email, source: "demo", demoOrganismeId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { demoOrganismeId: true },
  });
  if (existing?.demoOrganismeId) {
    const org = await prisma.organisme.findUnique({
      where: { id: existing.demoOrganismeId },
      select: { isDemo: true, statut: true },
    });
    if (org?.isDemo && org.statut === "ACTIF") {
      return Response.json({ ok: true, alreadyActive: true });
    }
  }

  try {
    const res = await provisionDemo({
      email,
      nom: (body.nom as string) ?? null,
      organisme: (body.organisme as string) ?? null,
      telephone: (body.telephone as string) ?? null,
      metier,
      utm: (body.utm as { source?: string; medium?: string; campaign?: string }) ?? null,
      ip,
    });
    if (!res.ok) return Response.json(res, { status: 500 });
    // On n'expose ni identifiants ni mot de passe dans la réponse HTTP.
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[/api/demo] provisionnement échoué", e);
    return Response.json({ ok: false, error: "Provisionnement impossible. Réessayez." }, { status: 500 });
  }
}
