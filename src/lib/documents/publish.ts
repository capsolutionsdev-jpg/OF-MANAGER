import "server-only";
import type { DocumentType } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { buildSingleDocPdf } from "@/lib/documents/build-pdf";
import { storeUpload } from "@/lib/blob";
import { isRecyclageOuRemiseANiveau, attestationRecyclageDocType } from "@/lib/documents/families";

/**
 * Cycle de vie documentaire B2B : génère un document (template → PDF), le stocke
 * (Blob / repli data:), et crée la ligne `DocumentGenere` qui le rend VISIBLE dans
 * l'espace client (rubrique Documents lue via inscription.entrepriseId).
 *
 * C'est la brique manquante : partout ailleurs les PDF sont générés + envoyés par
 * e-mail mais jamais persistés → la rubrique Documents restait vide.
 */

// Étape « convention signée » : documents à remettre aux salariés.
export const ETAPE_CONVENTION: DocumentType[] = [
  "REGLEMENT_INTERIEUR",
  "CONDITIONS_GENERALES",
  "CONVOCATION",
];
// Étape « 1er jour ».
export const ETAPE_ENTREE: DocumentType[] = ["ATTESTATION_ENTREE"];

type Db = Awaited<ReturnType<typeof getTenantDb>>;

/**
 * Publie UN document pour une inscription. Idempotent : si un document de ce type
 * (avec fichier) existe déjà, on ne régénère pas. Renvoie true si publié/déjà là.
 */
export async function publierDocument(
  db: Db,
  inscriptionId: string,
  sessionId: string | null,
  type: DocumentType,
  generatedById?: string | null,
): Promise<boolean> {
  const existing = await db.documentGenere.findFirst({
    where: { inscriptionId, type, fileUrl: { not: null } },
    select: { id: true },
  });
  if (existing) return true;

  const pdf = await buildSingleDocPdf(inscriptionId, type);
  if (!pdf) return false; // document non applicable à cette inscription

  let fileUrl: string;
  try {
    fileUrl = await storeUpload({
      data: pdf.data,
      folder: `documents/${inscriptionId}`,
      ext: "pdf",
      contentType: "application/pdf",
    });
  } catch {
    return false;
  }

  await db.documentGenere.create({
    data: { type, inscriptionId, sessionId, fileUrl, generatedById: generatedById ?? null },
  });
  return true;
}

type InscriptionLite = { id: string; sessionId: string };

async function publierPour(
  db: Db,
  inscriptions: InscriptionLite[],
  types: DocumentType[],
  generatedById?: string | null,
): Promise<number> {
  let count = 0;
  for (const insc of inscriptions) {
    for (const type of types) {
      if (await publierDocument(db, insc.id, insc.sessionId, type, generatedById)) count++;
    }
  }
  return count;
}

async function inscriptionsDeConvention(db: Db, conventionId: string): Promise<InscriptionLite[]> {
  const conv = await db.convention.findFirst({
    where: { id: conventionId },
    select: { inscriptions: { select: { id: true, sessionId: true } } },
  });
  return conv?.inscriptions ?? [];
}

/** Étape « convention signée » : RI + CGV + convocation pour tout le groupe. */
export async function publierEtapeConvention(conventionId: string, generatedById?: string | null): Promise<number> {
  const db = await getTenantDb();
  const inscriptions = await inscriptionsDeConvention(db, conventionId);
  return publierPour(db, inscriptions, ETAPE_CONVENTION, generatedById);
}

/** Étape « 1er jour » : attestation d'entrée pour tout le groupe. */
export async function publierEtapeEntree(conventionId: string, generatedById?: string | null): Promise<number> {
  const db = await getTenantDb();
  const inscriptions = await inscriptionsDeConvention(db, conventionId);
  return publierPour(db, inscriptions, ETAPE_ENTREE, generatedById);
}

/**
 * Étape « dernier jour ». Conditionnel PAR INSCRIPTION selon la formation :
 *  - attestation de FIN — ou, pour un RECYCLAGE / une remise à niveau (SSIAP…),
 *    l'attestation de recyclage / RAN correspondante (cf. attestationRecyclageDocType) ;
 *  - certificat de réalisation + enquête de satisfaction entreprise (toujours) ;
 *  - attestation de RÉUSSITE uniquement si la formation a un examen ET est réussie
 *    (jamais pour un recyclage : ces formations ne sont pas certifiantes, cf. #13).
 */
export async function publierEtapeFin(conventionId: string, generatedById?: string | null): Promise<number> {
  const db = await getTenantDb();
  const conv = await db.convention.findFirst({
    where: { id: conventionId },
    select: {
      inscriptions: {
        select: {
          id: true,
          sessionId: true,
          resultatCertification: true,
          session: {
            select: { formation: { select: { examen: true, reference: true, titre: true } } },
          },
        },
      },
    },
  });
  if (!conv) return 0;

  let count = 0;
  for (const insc of conv.inscriptions) {
    const f = insc.session.formation;
    const recyclage = isRecyclageOuRemiseANiveau(f);
    // Attestation de base : recyclage/RAN → doc dédié ; sinon attestation de fin.
    const attestationBase = (recyclage ? attestationRecyclageDocType(f) : "ATTESTATION_FIN") as DocumentType;
    const types: DocumentType[] = [attestationBase, "CERTIFICAT_REALISATION", "SATISFACTION_ENTREPRISE"];
    if (!recyclage && f.examen && insc.resultatCertification === "CERTIFIE") {
      types.push("ATTESTATION_REUSSITE");
    }
    count += await publierPour(db, [{ id: insc.id, sessionId: insc.sessionId }], types, generatedById);
  }
  return count;
}
