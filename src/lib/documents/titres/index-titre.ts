import "server-only";
import { genSel, hashDob } from "@/lib/anti-fraude/hash";
import type { TitreTypeDef } from "@/lib/documents/titres";

// Client Prisma (scopé tenant) passé par l'appelant. Helper pur (PAS un server
// action) → peut être importé partout, y compris depuis des fichiers "use server".
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

/**
 * Indexe un titre dans le registre vérifiable (TitreDelivre) : hash salé de la
 * date de naissance (jamais en clair), numéro, statut, organisme signataire.
 * Best-effort pour les diplômes (nécessite la date de naissance).
 */
export async function indexerTitre(
  db: Db,
  organismeId: string,
  p: {
    def: TitreTypeDef;
    numero: string;
    nom: string;
    prenom: string;
    dateNaissance: Date | null;
    organismeSignataire: string;
    dateDelivrance: Date;
    dateFinValidite?: Date | null;
    inscriptionId?: string | null;
    sessionId?: string | null;
    formationId?: string | null;
  },
): Promise<{ ok: boolean }> {
  if (!p.dateNaissance) return { ok: false }; // pas de date → non vérifiable
  // Idempotence : ne pas ré-indexer un même numéro déjà présent pour ce tenant.
  const existing = await db.titreDelivre.findFirst({
    where: { organismeId, numeroVerification: p.numero },
    select: { id: true },
  });
  if (existing) return { ok: true };
  const sel = genSel();
  await db.titreDelivre.create({
    data: {
      organismeId,
      typeCode: p.def.code,
      numeroVerification: p.numero,
      hashDateNaissance: hashDob(p.dateNaissance, sel),
      selUnique: sel,
      nomTitulaire: p.nom,
      prenomTitulaire: p.prenom,
      dateDelivrance: p.dateDelivrance,
      dateFinValidite: p.dateFinValidite ?? null,
      organismeSignataire: p.organismeSignataire,
      inscriptionId: p.inscriptionId ?? null,
      sessionId: p.sessionId ?? null,
      formationId: p.formationId ?? null,
    },
  });
  return { ok: true };
}
