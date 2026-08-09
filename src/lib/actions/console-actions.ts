"use server";

import { revalidatePath } from "next/cache";
import { OrganismeStatut, SupportStatut, LeadStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { sendEmail } from "@/lib/email";
import { logLeadEvent } from "@/lib/growth/events";

const STATUTS = new Set(Object.values(OrganismeStatut) as string[]);
const SUPPORT_STATUTS = new Set(Object.values(SupportStatut) as string[]);
const LEAD_STATUTS = new Set(Object.values(LeadStatut) as string[]);

/** Change rapidement le statut d'un organisme (tableau de bord / liste console). */
export async function setOrganismeStatut(id: string, statut: string): Promise<void> {
  await requireSuperAdmin();
  if (!STATUTS.has(statut)) return;
  await prisma.organisme.update({
    where: { id },
    data: { statut: statut as OrganismeStatut },
  });
  revalidatePath("/console");
  revalidatePath("/console/organismes");
  revalidatePath(`/console/${id}`);
}

// ── Support technique (côté éditeur) ─────────────────────────────────────────

/** L'éditeur répond à un ticket de support d'un organisme client. */
export async function replySupportTicket(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const ticketId = String(formData.get("ticketId") ?? "");
  const corps = String(formData.get("message") ?? "").trim();
  if (!ticketId || !corps) return;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { sujet: true, demandeurEmail: true },
  });

  await prisma.supportMessage.create({
    data: { ticketId, corps, parSupport: true, auteurNom: "Support OFManager" },
  });
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { nonLuClient: true, nonLuSupport: false, statut: SupportStatut.EN_COURS },
  });

  // Notifie le client par e-mail qu'une réponse l'attend (jamais bloquant).
  if (ticket?.demandeurEmail) {
    const url = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "";
    try {
      await sendEmail({
        to: ticket.demandeurEmail,
        subject: `Réponse du support — ${ticket.sujet}`,
        body:
          `Bonjour,\n\nVous avez reçu une réponse du support OFManager concernant « ${ticket.sujet} » :\n\n` +
          `${corps}\n\n` +
          (url ? `Consulter et répondre : ${url}/support` : `Connectez-vous à votre plateforme pour répondre.`),
      });
    } catch {
      /* l'échec d'envoi ne doit pas bloquer la réponse */
    }
  }

  revalidatePath("/console/support");
  revalidatePath("/console");
}

/** Change le statut d'un ticket (Ouvert / En cours / Résolu). */
export async function setSupportStatut(ticketId: string, statut: string): Promise<void> {
  await requireSuperAdmin();
  if (!SUPPORT_STATUTS.has(statut)) return;
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { statut: statut as SupportStatut },
  });
  revalidatePath("/console/support");
  revalidatePath("/console");
}

// ── Leads commerciaux (prospects du site vitrine) ────────────────────────────

/** Change le statut d'un lead (Nouveau / À rappeler / Rappelé / Converti / Perdu). */
export async function setLeadStatut(id: string, statut: string): Promise<void> {
  await requireSuperAdmin();
  if (!LEAD_STATUTS.has(statut)) return;
  const before = await prisma.lead.findUnique({ where: { id }, select: { statut: true } });
  await prisma.lead.update({
    where: { id },
    data: {
      statut: statut as LeadStatut,
      lu: true,
      ...(statut === "RAPPELE" ? { rappeleAt: new Date() } : {}),
    },
  });
  if (before && before.statut !== statut) {
    await logLeadEvent(id, "statut", {
      titre: `Statut : ${before.statut} → ${statut}`,
      meta: { de: before.statut, vers: statut },
    });
  }
  revalidatePath("/console/prospects");
  revalidatePath(`/console/prospects/${id}`);
  revalidatePath("/console");
}

/** Enregistre les notes internes d'un lead. */
export async function setLeadNotes(id: string, notes: string): Promise<void> {
  await requireSuperAdmin();
  await prisma.lead.update({ where: { id }, data: { notes: notes.trim() || null, lu: true } });
  revalidatePath("/console/prospects");
}

/** Marque un lead comme consulté (retire le badge « nouveau »). */
export async function markLeadRead(id: string): Promise<void> {
  await requireSuperAdmin();
  await prisma.lead.update({ where: { id }, data: { lu: true } });
  revalidatePath("/console/prospects");
  revalidatePath("/console");
}

/** Supprime un lead. */
export async function deleteLead(id: string): Promise<void> {
  await requireSuperAdmin();
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/console/prospects");
  revalidatePath("/console");
}
