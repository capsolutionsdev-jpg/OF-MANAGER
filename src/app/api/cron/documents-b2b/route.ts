import { assertCronAuthorized } from "@/lib/cron-auth";
import { publierDocumentsAutoParDate } from "@/lib/documents/publish-auto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Génération PDF (Chromium) → budget de fonction dédié, isolé de /parcours.
export const maxDuration = 60;

/**
 * Cron quotidien — cycle de vie documentaire B2B (volet automatique du modèle
 * hybride). Publie les documents « sûrs » (RI/CGV/convocation des conventions
 * signées, attestation d'entrée des sessions commencées) dans l'espace client.
 * Protégé par CRON_SECRET (Authorization: Bearer <CRON_SECRET>).
 */
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  const counts = await publierDocumentsAutoParDate();
  return Response.json({ ok: true, ranAt: new Date().toISOString(), counts });
}
