import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { civicCors, resolveCivicOrganismeId } from "@/lib/civique-api";
import { checkLimit, clientIp } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";

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

  // Validation d'entrée par SCHÉMA (A12-013) : types, longueurs bornées, e-mail valide,
  // e-mail normalisé (trim + minuscule). Remplace les vérifications ad hoc.
  const parsed = await parseBody(
    req,
    z.object({
      nom: z.string().trim().min(1).max(120),
      prenom: z.string().trim().min(1).max(120),
      email: z.string().trim().toLowerCase().email().max(200),
      telephone: z.string().trim().max(30).optional().default(""),
      mention: z.string().trim().max(60).optional(),
      organismeId: z.string().trim().max(60).optional(),
    }),
  );
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Nom, prénom et e-mail valides requis." },
      { status: 400, headers: civicCors },
    );
  }
  const { nom, prenom, email, telephone, mention } = parsed.data;

  // Correctif audit A05-002 : l'organisme cible ne peut PLUS être imposé
  // librement par le corps public (sinon écriture PII cross-tenant dans le CRM
  // d'un tenant arbitraire). Il provient de l'env CIVIC_ORGANISME_ID. Pour le
  // multi-vitrine, CIVIC_ORGANISME_IDS (liste blanche, séparée par des virgules)
  // autorise un body.organismeId UNIQUEMENT s'il y figure explicitement.
  const organismeId = resolveCivicOrganismeId(parsed.data.organismeId);
  if (!organismeId) {
    return NextResponse.json({ error: "Organisme non configuré." }, { status: 503, headers: civicCors });
  }

  const source = `Test de positionnement civique${mention ? ` (${mention})` : ""}`;
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
