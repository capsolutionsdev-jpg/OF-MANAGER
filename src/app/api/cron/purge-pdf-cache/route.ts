import { prisma } from "@/lib/prisma";
import { assertCronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rétention du cache PDF des dossiers d'inscription : au-delà de RETENTION_DAYS
// après la FIN de la session, on libère les octets stockés en base (colonne
// dossierPdf). Ce n'est qu'un cache : un dossier ancien rouvert sera simplement
// régénéré à la demande. Objectif : borner la taille de la base à mesure que la
// plateforme prend du trafic.
const RETENTION_DAYS = 120;

// Tâche planifiée (hebdomadaire). Protégée par CRON_SECRET (en-tête Bearer).
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.inscription.updateMany({
    where: {
      // « en cache » (dossierPdfVersion posé en même temps que les octets)
      dossierPdfVersion: { not: null },
      session: { dateFin: { lt: cutoff } },
    },
    data: { dossierPdf: null, dossierPdfVersion: null, dossierPdfName: null },
  });

  return Response.json({ ok: true, ranAt: new Date().toISOString(), purged: count });
}
