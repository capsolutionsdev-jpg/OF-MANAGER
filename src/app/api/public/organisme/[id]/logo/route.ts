import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Logo public d'un organisme, servi en HTTPS pour les e-mails (les clients mail
 * bloquent les images en `data:` base64 — d'où ce relais). Le logo est stocké en
 * base soit en URL http(s) (→ redirection), soit en `data:…;base64,…` (→ décodé
 * et renvoyé en binaire avec le bon Content-Type). 404 si l'organisme n'a pas de
 * logo (l'en-tête d'e-mail retombe alors sur la pastille 🎓).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const o = await prisma.organisme.findUnique({
    where: { id },
    select: { logoUrl: true },
  });
  const logo = o?.logoUrl;
  if (!logo) return new Response(null, { status: 404 });

  // URL http(s) → redirection vers l'asset hébergé.
  // Correctif audit P3 (open-redirect stocké) : n'accepter qu'une URL https
  // bien formée ; toute autre valeur (http, schéma exotique, malformée) → 404.
  if (/^https?:\/\//i.test(logo)) {
    try {
      const u = new URL(logo);
      if (u.protocol === "https:") return Response.redirect(u.toString(), 302);
    } catch {
      /* URL invalide */
    }
    return new Response(null, { status: 404 });
  }

  // data:<mime>;base64,<données>  (ou données URL-encodées)
  const m = logo.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
  if (!m) return new Response(null, { status: 404 });
  const mime = m[1] || "image/png";
  const bytes = m[2]
    ? Buffer.from(m[3], "base64")
    : Buffer.from(decodeURIComponent(m[3]), "utf8");

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
