"use server";

import { revalidatePath } from "next/cache";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { ContratPrestationStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Signature PUBLIQUE d'un contrat de prestation par le client (token dans l'URL,
 * pas d'authentification). Signature électronique interne : tracé manuscrit +
 * adresse IP + horodatage. Idempotent (déjà signé → succès).
 */
export async function signContratPrestation(
  token: string,
  nom: string,
  signatureDataUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const contrat = await prisma.contratPrestation.findUnique({
    where: { token },
    select: { id: true, statut: true },
  });
  if (!contrat) return { ok: false, error: "Lien invalide ou expiré." };
  if (contrat.statut === ContratPrestationStatut.SIGNE) return { ok: true };
  if (!nom.trim() || nom.trim().length < 2) return { ok: false, error: "Indiquez votre nom complet." };
  if (!signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);

  await prisma.contratPrestation.update({
    where: { id: contrat.id },
    data: {
      statut: ContratPrestationStatut.SIGNE,
      signataireNom: nom.trim(),
      signatureUrl: signatureDataUrl,
      signatureIp: ip,
      signedAt: new Date(),
    },
  });

  revalidatePath(`/contrat-prestation/${token}`);
  return { ok: true };
}
