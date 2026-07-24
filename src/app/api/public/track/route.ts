import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ingestion des vues de page du SITE VITRINE (analytics privacy-first).
// Appelé par un beacon depuis capacademy.fr : AUCUN cookie, AUCUNE donnée
// personnelle, pas d'IP stockée. On ne conserve que le chemin visité et le
// nom d'hôte du référent (ex. "google.com"). Scopé par VITRINE_ORGANISME_ID.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Réduit un référent à son nom d'hôte (ex. "https://www.google.com/x" → "google.com").
function refererHost(ref: unknown): string | null {
  if (typeof ref !== "string" || ref.trim() === "") return null;
  try {
    return new URL(ref).hostname.replace(/^www\./, "").slice(0, 120);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: { path?: unknown; referer?: unknown } = {};
  try {
    // Le beacon envoie du text/plain → on parse manuellement.
    const raw = await req.text();
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return new NextResponse(null, { status: 204, headers: CORS });
  }

  // Chemin obligatoire, doit commencer par "/" (on rejette les URL absolues).
  const path =
    typeof body.path === "string" && body.path.startsWith("/")
      ? body.path.slice(0, 300)
      : null;
  if (!path) return new NextResponse(null, { status: 204, headers: CORS });

  try {
    await prisma.pageVue.create({
      data: {
        organismeId: process.env.VITRINE_ORGANISME_ID || null,
        path,
        referer: refererHost(body.referer),
      },
    });
  } catch {
    // On n'échoue jamais côté client pour un simple tracking.
  }

  return new NextResponse(null, { status: 204, headers: CORS });
}
