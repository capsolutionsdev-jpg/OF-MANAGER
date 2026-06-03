import { prisma } from "@/lib/prisma";
import { buildInscriptionDocsZip } from "@/lib/documents/build-zip";

export const runtime = "nodejs";

// Téléchargement public (authentifié par le token du parcours candidat).
// Le candidat peut consulter ses documents (avant signature = aperçu,
// après signature = copie définitive).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const insc = await prisma.inscription.findUnique({
    where: { accessToken: token },
    select: { id: true },
  });
  if (!insc) return new Response("Lien invalide", { status: 404 });

  const zip = await buildInscriptionDocsZip(insc.id);
  if (!zip) return new Response("Documents introuvables", { status: 404 });

  return new Response(new Uint8Array(zip.data), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zip.filename}"`,
    },
  });
}
