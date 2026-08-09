import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Purge des tenants de DÉMONSTRATION expirés (RGPD : aucune donnée conservée
 * au-delà du filet dur). La sélection se fait sur `demoHardExpiresAt` : une démo
 * soft-expirée (48 h) reste récupérable (prolongation) tant que le filet dur
 * n'est pas dépassé ; passé le filet dur, le tenant est supprimé intégralement.
 */

// Ordre de suppression respectant les dépendances entre tables filles (repris du
// script de seed démo, éprouvé). Les autres tables scoping par organismeId sont
// balayées ensuite via le DMMF pour ne laisser aucune donnée orpheline.
const ORDERED = [
  "paiement", "facture", "diplome", "juryAffectation", "documentGenere", "signatureRequest",
  "consentement", "reclamation", "candidatMessage", "candidatInteraction", "pieceJointe",
  "inscription", "devis", "depenseCentre", "emailLog", "session", "apprenant", "candidat",
  "entreprise", "jury", "formateur", "salle", "formation", "auditLog",
] as const;

async function delMany(model: string, organismeId: string): Promise<void> {
  const client = prisma as unknown as Record<
    string,
    { deleteMany?: (args: unknown) => Promise<unknown> }
  >;
  const repo = client[model];
  if (!repo?.deleteMany) return;
  try {
    await repo.deleteMany({ where: { organismeId } });
  } catch {
    /* modèle sans organismeId, ou dépendance encore présente (repassée au tour suivant) */
  }
}

/** Toutes les tables (camelCase) portant un champ `organismeId`, hors User/Organisme. */
function tenantModelsFromDmmf(): string[] {
  return Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === "organismeId"))
    .map((m) => m.name.charAt(0).toLowerCase() + m.name.slice(1))
    .filter((n) => n !== "user" && n !== "organisme");
}

/**
 * Supprime INTÉGRALEMENT un tenant démo (données filles + utilisateurs + organisme).
 * Garde-fou : refuse tout organisme qui n'est PAS une démo.
 */
export async function purgeDemoOrganisme(organismeId: string): Promise<void> {
  const org = await prisma.organisme.findUnique({
    where: { id: organismeId },
    select: { isDemo: true },
  });
  if (!org) return; // déjà supprimé
  if (!org.isDemo) {
    throw new Error(`Refus : purge réservée aux tenants de démonstration (${organismeId}).`);
  }

  // 1) Tables filles dans l'ordre des dépendances connues.
  for (const m of ORDERED) await delMany(m, organismeId);

  // 2) Filet DMMF : toute autre table scoping par organismeId (créée via l'usage
  //    de l'app : tâches, notifications, automatisations…). Deux passes pour les
  //    éventuelles dépendances croisées restantes.
  const orderedSet = new Set<string>(ORDERED);
  const others = tenantModelsFromDmmf().filter((n) => !orderedSet.has(n));
  for (let pass = 0; pass < 2; pass++) for (const m of others) await delMany(m, organismeId);

  // 3) Détacher les Leads (demoOrganismeId n'est pas une FK → on nettoie le lien
  //    pour garder l'historique CRM sans référence morte).
  try {
    await prisma.lead.updateMany({
      where: { demoOrganismeId: organismeId },
      data: { demoOrganismeId: null },
    });
  } catch {
    /* non bloquant */
  }

  // 4) Utilisateurs (FK vers Organisme) puis l'organisme lui-même.
  await delMany("user", organismeId);
  await prisma.organisme.delete({ where: { id: organismeId } });
}

/** Purge tous les tenants démo dont le filet dur est dépassé. `now` injectable (tests). */
export async function purgeExpiredDemos(
  now: Date = new Date(),
): Promise<{ purged: number; orgIds: string[] }> {
  const expired = await prisma.organisme.findMany({
    where: { isDemo: true, demoHardExpiresAt: { not: null, lt: now } },
    select: { id: true },
  });

  const orgIds: string[] = [];
  for (const o of expired) {
    try {
      await purgeDemoOrganisme(o.id);
      orgIds.push(o.id);
    } catch (e) {
      console.error(`[demo-purge] échec purge tenant ${o.id}`, e);
    }
  }
  return { purged: orgIds.length, orgIds };
}
