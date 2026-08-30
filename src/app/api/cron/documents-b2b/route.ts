import { publierDocumentsAutoParDate } from "@/lib/documents/publish-auto";
import { runCron } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Génération PDF (Chromium) → budget de fonction dédié, isolé de /parcours.
export const maxDuration = 60;

/**
 * Cron quotidien — cycle de vie documentaire B2B (volet automatique du modèle
 * hybride) : publie les documents « sûrs » des conventions signées / sessions
 * commencées dans l'espace client. Protégé par CRON_SECRET.
 */
export function GET(req: Request) {
  return runCron(req, "documents-b2b", async () => {
    const counts = await publierDocumentsAutoParDate();
    return { counts };
  });
}
