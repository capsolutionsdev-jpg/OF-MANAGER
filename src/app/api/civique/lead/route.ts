import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { civicCors, resolveCivicOrganismeId } from "@/lib/civique-api";
import { checkLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/civique/lead — capture d'un prospect depuis le site vitrine
// (formulaire du test de positionnement). Crée/maj un Candidat (prospect)
// dans le CRM de l'organisme. Public (CORS) ; aucune donnée sensible.
export async function POST(req: Request) {
  // Anti-flood (audit SEC-050 / F-12) : endpoint public créant un Candidat →
  // plafond par IP pour éviter la pollution CRM. (Partagé via Upstash si config.)
  const rl = await checkLimit(`civique-lead:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans un instant." },
      { status: 429, headers: civicCors },
    );
  }

  let body: {
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    mention?: string;
    organismeId?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400, headers: civicCors });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const prenom = (body.prenom ?? "").trim();
  const nom = (body.nom ?? "").trim();
  const telephone = (body.telephone ?? "").trim();
  if (!email.includes("@") || !prenom || !nom) {
    return NextResponse.json({ error: "Nom, prénom et e-mail requis." }, { status: 400, headers: civicCors });
  }

  // Correctif audit A05-002 : l'organisme cible ne peut PLUS être imposé
  // librement par le corps public (sinon écriture PII cross-tenant dans le CRM
  // d'un tenant arbitraire). Il provient de l'env CIVIC_ORGANISME_ID. Pour le
  // multi-vitrine, CIVIC_ORGANISME_IDS (liste blanche, séparée par des virgules)
  // autorise un body.organismeId UNIQUEMENT s'il y figure explicitement.
  const organismeId = resolveCivicOrganismeId(body.organismeId);
  if (!organismeId) {
    return NextResponse.json({ error: "Organisme non configuré." }, { status: 503, headers: civicCors });
  }

  const source = `Test de positionnement civique${body.mention ? ` (${body.mention})` : ""}`;
  const existing = await prisma.candidat.findFirst({
    where: { organismeId, email },
    select: { id: true },
  });
  if (existing) {
    await prisma.candidat.update({
      where: { id: existing.id },
      data: { telephone: telephone || undefined },
    });
  } else {
    await prisma.candidat.create({
      data: { organismeId, nom, prenom, email, telephone: telephone || null, sourceConnaissance: source },
    });
  }

  return NextResponse.json({ ok: true }, { headers: civicCors });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: civicCors });
}
