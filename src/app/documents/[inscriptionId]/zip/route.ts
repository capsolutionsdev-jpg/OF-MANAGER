import { auth } from "@/auth";
import { buildInscriptionDocsZip } from "@/lib/documents/build-zip";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ inscriptionId: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { inscriptionId } = await params;
  const zip = await buildInscriptionDocsZip(inscriptionId);
  if (!zip) return new Response("Inscription introuvable", { status: 404 });

  return new Response(new Uint8Array(zip.data), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zip.filename}"`,
    },
  });
}
