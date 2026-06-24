import { NextResponse } from "next/server";
import {
  applyState,
  civicCors,
  getCandidatFromToken,
  serializeState,
  type CivicState,
} from "@/lib/civique-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Autorise uniquement le candidat propriétaire (le Bearer token doit
// correspondre au candidat dont l'id est dans l'URL).
async function authorize(req: Request, id: string) {
  const candidat = await getCandidatFromToken(req);
  if (!candidat || candidat.id !== id) return null;
  return candidat;
}

// GET /api/civique/candidates/:id/state — état complet de progression.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const candidat = await authorize(req, id);
  if (!candidat) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: civicCors });
  }
  const state = await serializeState(candidat.id);
  return NextResponse.json(state, { headers: civicCors });
}

// PUT /api/civique/candidates/:id/state — write-through complet depuis le vitrine.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const candidat = await authorize(req, id);
  if (!candidat) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: civicCors });
  }
  let state: Partial<CivicState>;
  try {
    state = (await req.json()) as Partial<CivicState>;
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400, headers: civicCors });
  }
  await applyState(candidat, state);
  return NextResponse.json({ ok: true }, { headers: civicCors });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: civicCors });
}
