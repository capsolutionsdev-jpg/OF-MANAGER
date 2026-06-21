import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseDataUrl } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

/**
 * Sert une pièce du dossier candidat (pièce d'identité, etc.) APRÈS autorisation,
 * sans jamais exposer l'URL de stockage brute (Vercel Blob). Autorisé pour :
 *  - le personnel back-office du même organisme (session) ;
 *  - l'apprenant propriétaire (session) ;
 *  - le candidat via son lien tokenisé (?token=…, parcours public).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("token");

  const piece = await prisma.pieceJointe.findUnique({
    where: { id },
    select: { url: true, mimeType: true, label: true, organismeId: true, candidatId: true },
  });
  if (!piece) return new Response("Introuvable", { status: 404 });

  // ── Autorisation ──
  let allowed = false;
  const session = await auth();
  if (session?.user) {
    const role = session.user.role as string;
    if (STAFF.includes(role) && session.user.organismeId === piece.organismeId) {
      allowed = true;
    } else if (role === "APPRENANT") {
      const ap = await prisma.apprenant.findUnique({
        where: { userId: session.user.id },
        select: { candidatId: true },
      });
      if (ap?.candidatId === piece.candidatId) allowed = true;
    }
  }
  if (!allowed && token) {
    const insc = await prisma.inscription.findUnique({
      where: { accessToken: token },
      select: { candidatId: true },
    });
    if (insc?.candidatId === piece.candidatId) allowed = true;
  }
  if (!allowed) return new Response("Accès refusé", { status: 403 });

  // ── Service du contenu (jamais l'URL brute) ──
  const filename = (piece.label || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
  const headersBase = {
    "Content-Disposition": `inline; filename="${filename}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  if (piece.url.startsWith("data:")) {
    const parsed = parseDataUrl(piece.url);
    if (!parsed) return new Response("Illisible", { status: 404 });
    return new Response(new Uint8Array(parsed.data), {
      headers: { ...headersBase, "Content-Type": parsed.mime },
    });
  }

  // Stockage distant (Vercel Blob) : on relaie le contenu côté serveur.
  const upstream = await fetch(piece.url).catch(() => null);
  if (!upstream || !upstream.ok) return new Response("Indisponible", { status: 502 });
  const buf = new Uint8Array(await upstream.arrayBuffer());
  return new Response(buf, {
    headers: {
      ...headersBase,
      "Content-Type": piece.mimeType || upstream.headers.get("content-type") || "application/octet-stream",
    },
  });
}
