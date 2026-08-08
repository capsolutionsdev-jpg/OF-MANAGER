import { auth } from "@/auth";
import { hasStrictFeature } from "@/lib/feature-guard";
import { buildDefraiementPdf } from "@/lib/documents/defraiement";

export const runtime = "nodejs";
export const maxDuration = 60; // génération PDF (Chromium serverless)
const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

/** Télécharge la note de défraiement (PDF) d'un membre de jury. Module `jurys`. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  if (!(await hasStrictFeature("jurys"))) return new Response("Module non activé", { status: 403 });

  const { id } = await params;
  const pdf = await buildDefraiementPdf(id);
  if (!pdf) return new Response("Affectation introuvable", { status: 404 });

  return new Response(Buffer.from(pdf.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
    },
  });
}
