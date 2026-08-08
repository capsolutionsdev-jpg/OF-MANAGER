"use server";

import { revalidatePath } from "next/cache";
import { SupportPriorite } from "@prisma/client";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const PRIORITES = new Set(Object.values(SupportPriorite) as string[]);
const readPriorite = (v: FormDataEntryValue | null): SupportPriorite =>
  PRIORITES.has(String(v)) ? (String(v) as SupportPriorite) : SupportPriorite.NORMALE;

const appUrl = () => process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "";

/** Notifie l'équipe support de l'éditeur (e-mail). Jamais bloquant. */
async function notifyEditorNewTicket(opts: {
  orgNom: string; sujet: string; priorite: string; demandeur: string | null; corps: string;
}) {
  const to = process.env.SUPPORT_NOTIFY_EMAIL;
  if (!to) return; // pas d'adresse de notification configurée → on n'envoie rien
  const url = appUrl();
  try {
    await sendEmail({
      to,
      subject: `[Support OFManager] Nouveau ticket — ${opts.orgNom} : ${opts.sujet}`,
      body:
        `Nouveau ticket de support.\n\n` +
        `Organisme : ${opts.orgNom}\n` +
        `Priorité : ${opts.priorite}\n` +
        `Demandeur : ${opts.demandeur ?? "—"}\n\n` +
        `Message :\n${opts.corps}\n\n` +
        (url ? `Traiter le ticket : ${url}/console/support` : `Connectez-vous à la console OFManager.`),
    });
  } catch {
    /* l'échec d'envoi ne doit pas bloquer la création du ticket */
  }
}

/** Notifie l'éditeur qu'un client a répondu dans un ticket (e-mail, jamais bloquant). */
async function notifyEditorReply(opts: {
  orgNom: string; sujet: string; auteur: string | null; corps: string;
}) {
  const to = process.env.SUPPORT_NOTIFY_EMAIL;
  if (!to) return;
  const url = appUrl();
  try {
    await sendEmail({
      to,
      subject: `[Support OFManager] Réponse client — ${opts.orgNom} : ${opts.sujet}`,
      body:
        `Nouvelle réponse sur un ticket de support.\n\n` +
        `Organisme : ${opts.orgNom}\n` +
        `Auteur : ${opts.auteur ?? "—"}\n\n` +
        `Message :\n${opts.corps}\n\n` +
        (url ? `Traiter le ticket : ${url}/console/support` : `Connectez-vous à la console OFManager.`),
    });
  } catch {
    /* l'échec d'envoi ne doit pas bloquer la réponse */
  }
}

/** Le client ouvre un nouveau ticket de support (depuis sa plateforme). */
export async function createSupportTicket(formData: FormData) {
  const session = await requireSection("support");
  const db = await getTenantDb();

  const organismeId = session?.user?.organismeId;
  if (!organismeId) return;

  const sujet = String(formData.get("sujet") ?? "").trim();
  const corps = String(formData.get("message") ?? "").trim();
  if (!sujet || !corps) return;

  const auteurNom = session?.user?.name ?? null;
  const ticket = await db.supportTicket.create({
    data: {
      organismeId,
      sujet,
      priorite: readPriorite(formData.get("priorite")),
      demandeurNom: auteurNom,
      demandeurEmail: session?.user?.email ?? null,
      nonLuSupport: true,
      nonLuClient: false,
    },
  });
  // SupportMessage est hors cloisonnement (sécurisé via le ticket déjà scopé).
  await prisma.supportMessage.create({
    data: { ticketId: ticket.id, corps, parSupport: false, auteurNom },
  });

  // Notifie l'éditeur par e-mail (si SUPPORT_NOTIFY_EMAIL configuré).
  const org = await prisma.organisme.findUnique({ where: { id: organismeId }, select: { nom: true } });
  await notifyEditorNewTicket({
    orgNom: org?.nom ?? "Organisme",
    sujet,
    priorite: ticket.priorite,
    demandeur: auteurNom,
    corps,
  });

  revalidatePath("/support");
}

/** Le client répond dans un de ses tickets. */
export async function replyTicketClient(formData: FormData) {
  const session = await requireSection("support");
  const db = await getTenantDb();

  const ticketId = String(formData.get("ticketId") ?? "");
  const corps = String(formData.get("message") ?? "").trim();
  if (!ticketId || !corps) return;

  // Vérifie l'appartenance au tenant (le client scopé renvoie null sinon).
  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  await prisma.supportMessage.create({
    data: { ticketId, corps, parSupport: false, auteurNom: session?.user?.name ?? null },
  });
  await db.supportTicket.update({
    where: { id: ticketId },
    data: { nonLuSupport: true, nonLuClient: false, statut: "OUVERT" },
  });

  // Notifie l'éditeur de la réponse (si SUPPORT_NOTIFY_EMAIL configuré).
  const org = await prisma.organisme.findUnique({
    where: { id: ticket.organismeId },
    select: { nom: true },
  });
  await notifyEditorReply({
    orgNom: org?.nom ?? "Organisme",
    sujet: ticket.sujet,
    auteur: session?.user?.name ?? null,
    corps,
  });

  revalidatePath("/support");
}

/** Le client a consulté ses réponses : on retire le badge « non lu » côté client. */
export async function markTicketReadClient(ticketId: string) {
  await requireSection("support");
  const db = await getTenantDb();
  await db.supportTicket.update({ where: { id: ticketId }, data: { nonLuClient: false } });
  revalidatePath("/support");
}
