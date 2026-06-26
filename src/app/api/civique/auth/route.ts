import { NextResponse } from "next/server";
import { civicCors, entitledMentions, getCandidatFromToken } from "@/lib/civique-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/civique/auth
// Le vitrine envoie { email } + Authorization: Bearer <civicToken>.
// On valide que le token correspond bien à un candidat dont l'e-mail matche,
// puis on renvoie son identité (le compte est créé par la plateforme).
export async function POST(req: Request) {
  const candidat = await getCandidatFromToken(req);
  if (!candidat) {
    return NextResponse.json({ error: "Jeton invalide" }, { status: 401, headers: civicCors });
  }
  let email = "";
  try {
    const body = (await req.json()) as { email?: string };
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    /* corps vide accepté */
  }
  if (email && email !== candidat.email.toLowerCase()) {
    return NextResponse.json({ error: "E-mail non concordant" }, { status: 403, headers: civicCors });
  }
  // Formations souscrites (le candidat n'accède qu'à celles-ci).
  const mentions = await entitledMentions(candidat.id);
  return NextResponse.json(
    { id: candidat.id, prenom: candidat.prenom, email: candidat.email, mentions },
    { headers: civicCors },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: civicCors });
}
