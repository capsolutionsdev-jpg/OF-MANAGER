import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rôles autorisés à provisionner un accès e-learning candidat.
const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
const VITRINE_BASE = process.env.VITRINE_URL ?? "https://capacademy.fr";

/**
 * POST /api/civique/candidates/:id/provision
 * Crée (ou régénère avec ?regenerate=1) le code d'accès e-learning civique
 * d'un candidat : c'est la PLATEFORME qui provisionne le compte. Réservé au
 * personnel du même organisme (session back-office). Renvoie le code à
 * transmettre au candidat + l'URL de connexion du site vitrine.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (!session?.user || !role || !STAFF.includes(role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const candidat = await prisma.candidat.findUnique({
    where: { id },
    select: { id: true, email: true, organismeId: true, civicToken: true },
  });
  if (!candidat) {
    return NextResponse.json({ error: "Candidat introuvable" }, { status: 404 });
  }

  // Cloisonnement multi-tenant : un staff n'accède qu'à son organisme
  // (le SUPERADMIN éditeur, sans organisme, n'est pas restreint).
  if (role !== "SUPERADMIN" && session.user.organismeId !== candidat.organismeId) {
    return NextResponse.json({ error: "Accès refusé (autre organisme)" }, { status: 403 });
  }

  const regenerate = new URL(req.url).searchParams.get("regenerate") === "1";
  let token = candidat.civicToken;
  if (!token || regenerate) {
    token = randomBytes(24).toString("base64url");
    await prisma.candidat.update({ where: { id }, data: { civicToken: token } });
  }

  return NextResponse.json({
    candidatId: candidat.id,
    email: candidat.email,
    civicToken: token,
    loginUrl: `${VITRINE_BASE}/cap-language-academy/examen-civique/connexion`,
  });
}
