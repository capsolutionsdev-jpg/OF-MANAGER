import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { civicCors } from "@/lib/civique-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/civique/lead — capture d'un prospect depuis le site vitrine
// (formulaire du test de positionnement). Crée/maj un Candidat (prospect)
// dans le CRM de l'organisme. Public (CORS) ; aucune donnée sensible.
export async function POST(req: Request) {
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

  // Correctif audit P3 : organisme cible = env CIVIC_ORGANISME_ID (ou corps pour
  // le multi-vitrine) — plus d'auto-détection de « l'organisme le plus ancien »
  // qui rattachait leads/paiements civiques à un tenant arbitraire.
  const organismeId = process.env.CIVIC_ORGANISME_ID ?? body.organismeId ?? null;
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
