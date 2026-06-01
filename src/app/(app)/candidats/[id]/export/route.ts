import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";

// Export RGPD (portabilité) : toutes les données du candidat au format JSON.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { id } = await params;
  const candidat = await prisma.candidat.findUnique({
    where: { id },
    include: {
      inscriptions: {
        include: { session: { include: { formation: true } } },
      },
      pieces: true,
      consentements: true,
      apprenant: true,
    },
  });
  if (!candidat) return new Response("Introuvable", { status: 404 });

  const json = JSON.stringify(
    candidat,
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  );

  return new Response(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="donnees-rgpd-${id}.json"`,
    },
  });
}
