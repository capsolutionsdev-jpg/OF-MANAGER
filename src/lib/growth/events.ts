import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma, prismaBase, txWithOrg } from "@/lib/prisma";

/**
 * Timeline & scoring des leads (console growth éditeur).
 * Chaque événement est journalisé (LeadEvent) et incrémente le score
 * d'engagement du lead selon un barème simple et lisible.
 */

export const LEAD_EVENT_TYPES = {
  creation:          { label: "Lead créé",                score: 5 },
  demo_demandee:     { label: "Démo demandée",            score: 20 },
  demo_provisionnee: { label: "Démo provisionnée",        score: 10 },
  demo_connexion:    { label: "Première connexion démo",  score: 25 },
  demo_prolongee:    { label: "Démo prolongée",           score: 20 },
  demo_expiree:      { label: "Démo expirée (purge)",     score: 0 },
  email_ouvert:      { label: "E-mail ouvert",            score: 5 },
  email_clic:        { label: "Lien e-mail cliqué",       score: 10 },
  statut:            { label: "Statut modifié",           score: 0 },
  conversion:        { label: "Converti en client",       score: 30 },
  note:              { label: "Note ajoutée",             score: 0 },
  import:            { label: "Importé (CSV)",            score: 0 },
} as const;

export type LeadEventType = keyof typeof LEAD_EVENT_TYPES;

/**
 * Journalise un événement sur un lead + met à jour son score.
 * NON BLOQUANT : ne lève jamais (le flux appelant — provisionnement, connexion,
 * webhook — ne doit pas casser pour un souci de journalisation).
 */
export async function logLeadEvent(
  leadId: string,
  type: LeadEventType,
  opts?: { titre?: string; meta?: Prisma.InputJsonValue },
): Promise<void> {
  const def = LEAD_EVENT_TYPES[type];
  if (!def) return;
  try {
    // Lead/LeadEvent = données éditeur (globales, sans policy RLS) → BYPASS.
    // Ops sur `prismaBase` : une transaction tableau ne peut pas passer par le
    // client étendu (chaque op y serait déjà enveloppée).
    await txWithOrg("BYPASS", [
      prismaBase.leadEvent.create({
        data: { leadId, type, titre: opts?.titre ?? def.label, meta: opts?.meta },
      }),
      ...(def.score !== 0
        ? [prismaBase.lead.update({ where: { id: leadId }, data: { score: { increment: def.score } } })]
        : []),
    ]);
  } catch (e) {
    console.error(`[growth] logLeadEvent(${type}) échoué pour lead ${leadId}`, e);
  }
}

/**
 * Variante par tenant démo : retrouve le lead lié (Lead.demoOrganismeId) puis
 * journalise. Silencieux si aucun lead n'est lié. Non bloquant.
 */
export async function logLeadEventByDemoOrg(
  demoOrganismeId: string,
  type: LeadEventType,
  opts?: { titre?: string; meta?: Prisma.InputJsonValue },
): Promise<void> {
  try {
    const lead = await prisma.lead.findFirst({
      where: { demoOrganismeId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (lead) await logLeadEvent(lead.id, type, opts);
  } catch (e) {
    console.error(`[growth] logLeadEventByDemoOrg(${type}) échoué pour org ${demoOrganismeId}`, e);
  }
}
