import { prisma } from "@/lib/prisma";
import { buildInscriptionPdf } from "@/lib/documents/build-pdf";
import { linkExpired } from "@/lib/token";

export const runtime = "nodejs";
export const maxDuration = 60;

// Téléchargement / aperçu public (authentifié par le token du parcours).
// ?preview=1 → aperçu inline des documents à signer (avant signature).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const insc = await prisma.inscription.findUnique({
    where: { accessToken: token },
    select: { id: true, signedAt: true, session: { select: { dateFin: true } } },
  });
  if (!insc) return new Response("Lien invalide", { status: 404 });
  // Expiration : un lien fuité ne donne plus accès aux documents 12 mois après la fin.
  if (linkExpired(insc.session?.dateFin)) {
    return new Response("Lien expiré", { status: 410 });
  }

  const preview = new URL(req.url).searchParams.get("preview") === "1";

  try {
    // Aperçu AVANT signature (?preview=1) : uniquement les documents à consulter
    // (fiche, contrat XOR convention selon profil, CGV, règlement, programme) —
    // jamais d'attestations/convocations (le candidat vient de s'inscrire), cf. #10.
    // Téléchargement (après signature) : les documents effectivement signés.
    const pdf = preview
      ? await buildInscriptionPdf(insc.id, {
          presignOnly: true,
          includeCertificat: false,
        })
      : await buildInscriptionPdf(insc.id, { signedOnly: true });

    if (!pdf) return new Response("Documents introuvables", { status: 404 });

    return new Response(new Uint8Array(pdf.data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${pdf.filename}"`,
      },
    });
  } catch (e) {
    // OFM-12 : NE PAS exposer message/stack en prod sur cette route PUBLIQUE (fuite
    // d'internes serveur). En dev on aide au diagnostic ; en prod, message générique
    // et trace côté serveur uniquement (aligné sur api/pdf-test — durcissement P2-3).
    const isDev = process.env.NODE_ENV !== "production";
    console.error("[parcours/documents] génération PDF échouée:", e);
    const detail = e instanceof Error ? `${e.message}\n\n${e.stack ?? ""}` : String(e);
    return new Response(
      isDev ? `Erreur génération PDF:\n${detail}` : "Erreur lors de la génération du document.",
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
}
