import { prisma } from "@/lib/prisma";
import { runCron } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rétention du cache PDF des dossiers d'inscription : au-delà de RETENTION_DAYS
// après la FIN de la session, on libère les octets stockés en base (dossierPdf).
// Ce n'est qu'un cache : un dossier ancien rouvert est régénéré à la demande.
const RETENTION_DAYS = 120;

// Tâche planifiée (hebdomadaire). Protégée par CRON_SECRET.
export function GET(req: Request) {
  return runCron(req, "purge-pdf-cache", async () => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const { count } = await prisma.inscription.updateMany({
      where: {
        dossierPdfVersion: { not: null },
        session: { dateFin: { lt: cutoff } },
      },
      data: { dossierPdf: null, dossierPdfVersion: null, dossierPdfName: null },
    });
    return { purged: count };
  });
}
