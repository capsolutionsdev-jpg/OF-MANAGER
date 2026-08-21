"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireStaffTenant } from "@/lib/tenant";
import { storeUpload, parseDataUrl, detectFileType } from "@/lib/blob";

// ~3,5 Mo : le PDF transite en data-URL base64 (~+33 %) via une Server Action,
// dont la limite de corps est de 5 Mo (next.config bodySizeLimit). On plafonne
// donc en-deçà pour un refus explicite plutôt qu'un échec de transport opaque.
const MAX_FACTURE_BYTES = Math.floor(3.5 * 1024 * 1024);

/**
 * Dépose une facture (PDF fait sur un autre logiciel) pour une entreprise
 * cliente. Réservé au personnel de l'organisme. Le PDF est stocké (Vercel Blob
 * ou data-URL en dev) et la facture devient téléchargeable par le client depuis
 * son espace. Pas de génération : on ne fait que déposer + référencer.
 */
export async function depositFacture(input: {
  entrepriseId: string;
  reference: string;
  montantTTC?: number;
  dataUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { db } = await requireStaffTenant();

  // L'entreprise doit appartenir au tenant courant (le client BD est déjà
  // cloisonné par organisme → findFirst renvoie null si elle est ailleurs).
  const ent = await db.entreprise.findFirst({
    where: { id: input.entrepriseId },
    select: { id: true },
  });
  if (!ent) return { ok: false, error: "Entreprise introuvable." };

  const reference = input.reference.trim();
  if (!reference) return { ok: false, error: "La référence de la facture est obligatoire." };

  // Montant : jamais négatif (par défaut 0 si absent/invalide).
  const montantTTC =
    input.montantTTC != null && Number.isFinite(input.montantTTC) && input.montantTTC >= 0
      ? input.montantTTC
      : 0;

  // Pré-vérification du doublon de référence (unicité par organisme) AVANT
  // l'upload : évite un fichier Blob orphelin et donne un message clair.
  const existing = await db.facture.findFirst({ where: { reference }, select: { id: true } });
  if (existing) return { ok: false, error: "Une facture porte déjà cette référence." };

  const parsed = parseDataUrl(input.dataUrl);
  if (!parsed) return { ok: false, error: "Fichier illisible." };
  // Double contrôle : entête déclarée ET signature réelle (magic bytes) = PDF.
  const realType = detectFileType(Buffer.from(parsed.data));
  if (parsed.mime !== "application/pdf" || realType !== "application/pdf") {
    return { ok: false, error: "Le fichier doit être un PDF." };
  }
  if (parsed.data.byteLength > MAX_FACTURE_BYTES) {
    return { ok: false, error: "PDF trop volumineux (max 3,5 Mo)." };
  }

  const fileUrl = await storeUpload({
    data: parsed.data,
    folder: `factures/${input.entrepriseId}`,
    ext: "pdf",
    contentType: "application/pdf",
  });

  try {
    await db.facture.create({
      data: {
        entrepriseId: input.entrepriseId,
        reference,
        montantTTC,
        fileUrl,
        statut: "ENVOYEE",
      },
    });
  } catch (e) {
    // Contrainte @@unique([organismeId, reference]).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Une facture porte déjà cette référence." };
    }
    throw e;
  }

  revalidatePath(`/clients-pro/${input.entrepriseId}`);
  return { ok: true };
}
