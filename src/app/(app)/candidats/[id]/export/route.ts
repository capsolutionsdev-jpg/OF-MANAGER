import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Rôles autorisés à exporter les données d'un candidat (comme les autres exports).
const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

// Export RGPD (portabilité) : toutes les données du candidat au format JSON.
// RÉSERVÉ AU STAFF (défense en profondeur, en plus du middleware) + PLAFONNÉ
// (anti-exfiltration en masse / énumération d'id) + TRACÉ en journal d'audit.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });
  if (!STAFF.includes(session.user.role)) return new Response("Accès refusé", { status: 403 });

  const rl = rateLimit(`export-candidat:${session.user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return new Response("Trop de requêtes. Réessayez plus tard.", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter) },
    });
  }

  const db = await getTenantDb();
  const { id } = await params;
  const candidat = await db.candidat.findUnique({
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

  // Traçabilité RGPD : qui a exporté les données de quel candidat, quand.
  await db.auditLog
    .create({ data: { userId: session.user.id, action: "EXPORT_RGPD", entityType: "Candidat", entityId: id } })
    .catch(() => {});

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
