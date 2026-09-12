import { prisma } from "@/lib/prisma";
import { organismeScope } from "@/lib/public-scope";
import { toPublicSessionDTO } from "@/lib/public-dto";
import { publicJson } from "@/lib/api-version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API publique : prochaines sessions ouvertes (pour le site vitrine).
// Lecture seule, sans données personnelles. CORS ouvert.
// Portée (multi-tenant) : `?organisme=<id>`, repli sur VITRINE_ORGANISME_ID.
export async function GET(req: Request) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const organismeId = organismeScope(req);

  const sessions = await prisma.session.findMany({
    where: {
      isArchived: false,
      statut: { in: ["PLANIFIEE", "OUVERTE"] },
      dateDebut: { gte: start },
      ...(organismeId ? { organismeId } : {}),
    },
    include: {
      formation: { select: { titre: true, academy: true, reference: true } },
      inscriptions: { where: { statut: { not: "ANNULEE" } }, select: { id: true } },
    },
    orderBy: { dateDebut: "asc" },
    take: 60,
  });

  const data = sessions.map(toPublicSessionDTO);

  return publicJson({ sessions: data, generatedAt: new Date().toISOString() });
}
