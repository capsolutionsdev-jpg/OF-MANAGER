import "server-only";
import type { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildSingleDocPdf } from "@/lib/documents/build-pdf";
import { storeUpload } from "@/lib/blob";
import { ETAPE_CONVENTION, ETAPE_ENTREE } from "@/lib/documents/publish";

/**
 * Publication AUTOMATIQUE par date (cron, SANS session). Volet « automatique » du
 * modèle hybride retenu : les documents « sûrs » (indépendants du résultat) sont
 * mis à disposition tout seuls dans l'espace client.
 *
 * Contrainte multi-tenant : pas de session en cron → on n'utilise PAS getTenantDb
 * (qui injecte l'organisme). On passe par le client `prisma` brut et on fixe
 * `organismeId` EXPLICITEMENT sur chaque écriture (cf. publierRaw).
 *
 * Contrainte Vercel (Hobby = 60 s / fonction) : la génération PDF (Chromium) est
 * bornée par MAX_DOCS_PER_RUN. Un backlog se draine sur plusieurs jours — c'est un
 * FILET (le chemin principal reste synchrone à la validation + boutons manuels).
 */

// Garde-fou anti-timeout : ~15 PDF/exécution (Chromium ≈ 2-3 s/doc → marge < 60 s).
const MAX_DOCS_PER_RUN = 15;

/**
 * Résultat d'une tentative de publication. Le budget anti-timeout paie le TRAVAIL
 * Chromium (rendu PDF), pas le succès : « ignore » (déjà publié) est gratuit, mais
 * « cree » ET « echec » ont tous deux invoqué buildSingleDocPdf → consomment le budget.
 */
type PublierResultat = "cree" | "ignore" | "echec";

/** Publie UN document via prisma brut (organismeId explicite). Idempotent. */
async function publierRaw(
  organismeId: string | null,
  inscriptionId: string,
  sessionId: string | null,
  type: DocumentType,
): Promise<PublierResultat> {
  // Idempotence : pas de filtre organisme volontairement — `inscriptionId` est un
  // cuid globalement unique, donc la recherche ne peut pas franchir de tenant.
  const existing = await prisma.documentGenere.findFirst({
    where: { inscriptionId, type, fileUrl: { not: null } },
    select: { id: true },
  });
  if (existing) return "ignore"; // déjà publié → aucun rendu (gratuit)

  let pdf: Awaited<ReturnType<typeof buildSingleDocPdf>>;
  try {
    pdf = await buildSingleDocPdf(inscriptionId, type);
  } catch {
    return "echec"; // un doc en échec ne doit pas casser tout le lot (mais Chromium a été tenté)
  }
  if (!pdf) return "echec"; // document non applicable à cette inscription

  let fileUrl: string;
  try {
    fileUrl = await storeUpload({
      data: pdf.data,
      folder: `documents/${inscriptionId}`,
      ext: "pdf",
      contentType: "application/pdf",
    });
  } catch {
    return "echec";
  }

  await prisma.documentGenere.create({
    data: { organismeId, type, inscriptionId, sessionId, fileUrl },
  });
  return "cree";
}

export type AutoPublishCounts = { convention: number; entree: number; scanned: number };

/**
 * Deux étapes « sûres » du cycle documentaire B2B :
 *  1) Filet « convention signée » : RI + CGV + convocation pour les inscriptions
 *     dont la convention est SIGNEE mais dont ces documents manquent encore
 *     (rattrape un échec de la publication synchrone au moment de la validation).
 *  2) « 1er jour » : attestation d'entrée dès que la session a commencé
 *     (dateDebut <= maintenant) pour les inscriptions B2B validées.
 *
 * Idempotent (ne republie jamais) et borné (MAX_DOCS_PER_RUN) pour tenir < 60 s.
 */
export async function publierDocumentsAutoParDate(
  now: Date = new Date(),
): Promise<AutoPublishCounts> {
  const counts: AutoPublishCounts = { convention: 0, entree: 0, scanned: 0 };
  let budget = MAX_DOCS_PER_RUN;

  // ── Étape 1 : filet convention signée ────────────────────────────────
  const convs = await prisma.convention.findMany({
    where: { signatureStatut: "SIGNEE", entrepriseId: { not: null } },
    select: { organismeId: true, inscriptions: { select: { id: true, sessionId: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  for (const c of convs) {
    for (const insc of c.inscriptions) {
      counts.scanned++;
      for (const type of ETAPE_CONVENTION) {
        if (budget <= 0) return counts;
        const r = await publierRaw(c.organismeId, insc.id, insc.sessionId, type);
        if (r === "cree") counts.convention++;
        if (r !== "ignore") budget--; // toute TENTATIVE Chromium (cree|echec) paie le budget
      }
    }
  }

  // ── Étape 2 : attestation d'entrée (sessions commencées) ─────────────
  const inscriptions = await prisma.inscription.findMany({
    where: {
      statut: "VALIDEE",
      entrepriseId: { not: null },
      session: { dateDebut: { lte: now } },
    },
    select: { id: true, sessionId: true, organismeId: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  for (const insc of inscriptions) {
    counts.scanned++;
    for (const type of ETAPE_ENTREE) {
      if (budget <= 0) return counts;
      const r = await publierRaw(insc.organismeId, insc.id, insc.sessionId, type);
      if (r === "cree") counts.entree++;
      if (r !== "ignore") budget--; // toute TENTATIVE Chromium (cree|echec) paie le budget
    }
  }

  return counts;
}
