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
  const sel = genSel();
  const data = {
    typeCode: p.def.code,
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
  };

  const existing = await db.titreDelivre.findFirst({
    where: { organismeId, numeroVerification: p.numero },
    select: {
      id: true, selUnique: true, hashDateNaissance: true,
      nomTitulaire: true, prenomTitulaire: true,
    },
  });
  if (existing) {
    // Même titulaire (même nom + même date de naissance re-hashée avec le sel
    // existant) → idempotent, rien à faire.
    const sameDob = hashDob(p.dateNaissance, existing.selUnique) === existing.hashDateNaissance;
    const sameName =
      (existing.nomTitulaire ?? "").trim().toLowerCase() === p.nom.trim().toLowerCase() &&
      (existing.prenomTitulaire ?? "").trim().toLowerCase() === p.prenom.trim().toLowerCase();
    if (sameDob && sameName) return { ok: true };
    // Numéro RÉ-ATTRIBUÉ à un autre titulaire (ex. diplôme précédent supprimé) :
    // on écrase l'entrée orpheline pour ne jamais vérifier la mauvaise personne.
    await db.titreDelivre.update({ where: { id: existing.id }, data });
    return { ok: true };
  }
  await db.titreDelivre.create({ data: { organismeId, numeroVerification: p.numero, ...data } });
  return { ok: true };
}
