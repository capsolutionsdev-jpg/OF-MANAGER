import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { mapFolder } from "@/lib/wedof";
import { wedofOrderedWhere } from "@/lib/wedof-sync";
import { reportError } from "@/lib/observability/report-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Réception des notifications Wedof (registrationFolder.*) pour UN organisme.
 * L'OF configure dans Wedof l'URL .../api/webhooks/wedof/<orgId> + un secret ;
 * on vérifie la signature HMAC-SHA512 du corps brut avec ce secret (stocké
 * chiffré) avant de mettre à jour le dossier. Aucune session ici → on pose
 * l'organismeId explicitement.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const raw = await req.text();

  const org = await prisma.organisme.findUnique({
    where: { id: orgId },
    select: { wedofWebhookSecret: true },
  });
  const secret = decryptSecret(org?.wedofWebhookSecret);
  if (!secret) return new NextResponse("Webhook non configuré.", { status: 404 });

  // Signature HMAC-SHA512 du corps brut (comparaison à temps constant).
  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  const got = req.headers.get("x-wedof-signature") ?? "";
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new NextResponse("Signature invalide.", { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let folder: any = null;
  try {
    const body = JSON.parse(raw);
    folder = body?.externalId ? body : (body?.data ?? body);
  } catch {
    return new NextResponse("Corps invalide.", { status: 400 });
  }
  if (!folder?.externalId) return NextResponse.json({ ok: true, skipped: true });

  const m = mapFolder(folder);
  const fields = {
    type: m.type,
    financeur: m.financeur,
    etat: m.etat,
    montant: m.montant,
    wedofEtat: m.wedofEtat,
    wedofMajLe: m.wedofMajLe,
  };

  // Écriture idempotente + garde d'ordre (A12-006) : ne pas écraser un état plus
  // récent avec un événement en retard, et journaliser les échecs (A12-006/016) —
  // 500 → Wedof retentera. Scopé à l'organismeId du chemin (défense en profondeur).
  try {
    const upd = await prisma.dossierFinancement.updateMany({
      where: { ...wedofOrderedWhere(m.wedofId, m.wedofMajLe), organismeId: orgId },
      data: fields,
    });
    if (upd.count === 0) {
      const exists = await prisma.dossierFinancement.findFirst({
        where: { wedofId: m.wedofId, organismeId: orgId },
        select: { id: true },
      });
      if (!exists) {
        await prisma.dossierFinancement.create({
          data: { organismeId: orgId, wedofId: m.wedofId, ...fields },
        });
      }
      // sinon : événement plus ancien que l'état stocké → ignoré (garde d'ordre)
    }
  } catch (e) {
    reportError(e, { tag: "wedof:webhook", extra: { orgId, wedofId: m.wedofId } });
    return new NextResponse("Erreur de traitement.", { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
