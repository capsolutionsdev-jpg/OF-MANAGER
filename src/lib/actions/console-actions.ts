"use server";

import { revalidatePath } from "next/cache";
import { OrganismeStatut, SupportStatut, LeadStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { smsPackByKey } from "@/lib/options";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { sendEmail } from "@/lib/email";
import { logLeadEvent } from "@/lib/growth/events";
import {
  mapExcelStatut,
  normalizePriorite,
  regionFromCodePostal,
  departementFromCodePostal,
} from "@/lib/growth/crm-prospect";
import { uniqueSubdomain } from "@/lib/subdomain";
import { CORE_FEATURE_KEYS } from "@/lib/features";

const STATUTS = new Set(Object.values(OrganismeStatut) as string[]);
const SUPPORT_STATUTS = new Set(Object.values(SupportStatut) as string[]);
const LEAD_STATUTS = new Set(Object.values(LeadStatut) as string[]);

/** Change rapidement le statut d'un organisme (tableau de bord / liste console). */
export async function setOrganismeStatut(id: string, statut: string): Promise<void> {
  const actor = await requireSuperAdmin();
  if (!STATUTS.has(statut)) return;
  await prisma.organisme.update({
    where: { id },
    data: { statut: statut as OrganismeStatut },
  });
  await prisma.auditLog.create({
    data: {
      organismeId: id,
      userId: actor!.user!.id as string,
      action: "UPDATE",
      entityType: "Organisme",
      entityId: id,
      changesJson: { statut },
    },
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

/** Change le statut d'un lead dans le pipeline (8 étapes + Perdu). */
export async function setLeadStatut(id: string, statut: string): Promise<void> {
  await requireSuperAdmin();
  if (!LEAD_STATUTS.has(statut)) return;
  const before = await prisma.lead.findUnique({ where: { id }, select: { statut: true } });
  await prisma.lead.update({
    where: { id },
    data: {
      statut: statut as LeadStatut,
      lu: true,
      ...(statut === "CONTACTE" ? { rappeleAt: new Date() } : {}),
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

/** Enregistre la qualification commerciale d'un prospect (5 axes, plan feuille 6). */
export async function setLeadQualification(
  leadId: string,
  data: {
    verticale?: string | null;
    outilActuel?: string | null;
    echeanceQualiopi?: string | null;
    volumeStagiairesMois?: number | null;
    malARemplir?: boolean | null;
    decideur?: string | null;
  },
): Promise<{ ok: boolean }> {
  await requireSuperAdmin();
  const pick = (v: string | null | undefined, allowed: string[]) =>
    v && allowed.includes(v) ? v : null;
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      verticale: pick(data.verticale, ["securite", "transport", "autre"]),
      outilActuel: pick(data.outilActuel, ["aucun", "excel", "concurrent", "inconnu"]),
      echeanceQualiopi: pick(data.echeanceQualiopi, ["moins_6_mois", "plus_6_mois", "non_concerne", "inconnu"]),
      volumeStagiairesMois:
        typeof data.volumeStagiairesMois === "number" && data.volumeStagiairesMois >= 0
          ? Math.floor(data.volumeStagiairesMois)
          : null,
      malARemplir: typeof data.malARemplir === "boolean" ? data.malARemplir : null,
      decideur: data.decideur?.trim() || null,
      lu: true,
    },
  });
  revalidatePath(`/console/prospects/${leadId}`);
  revalidatePath("/console/prospects");
  return { ok: true };
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

// ── Ajout manuel d'un prospect (prospection sortante) ───────────────────────

export type CreateLeadState = { ok?: boolean; error?: string };

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Crée un prospect manuellement depuis la console (bouton « Ajouter un
 * prospect » de la page Prospects). Reprend la trame des fichiers Excel :
 * OF, localisation, contact, métier, priorité, statut. Région / département
 * sont déduits du code postal si non fournis. SUPERADMIN.
 */
export async function createLeadManuel(
  _prev: CreateLeadState | undefined,
  formData: FormData,
): Promise<CreateLeadState> {
  await requireSuperAdmin();

  const nomOF = str(formData, "nomOF");
  if (!nomOF) return { error: "Le nom de l'organisme est requis." };

  const email = str(formData, "email").toLowerCase();
  if (email && !EMAIL_RE.test(email)) return { error: "E-mail invalide." };

  const verticaleRaw = str(formData, "verticale");
  const verticale = ["securite", "transport", "autre"].includes(verticaleRaw) ? verticaleRaw : null;

  const codePostal = str(formData, "codePostal") || null;
  const region = str(formData, "region") || regionFromCodePostal(codePostal);
  const departement = str(formData, "departement") || departementFromCodePostal(codePostal);

  const statutRaw = str(formData, "statut");
  const statut = LEAD_STATUTS.has(statutRaw) ? (statutRaw as LeadStatut) : mapExcelStatut(statutRaw);

  const siret = str(formData, "siret").replace(/\D/g, "") || null;
  // Dédoublonnage : par SIRET, sinon par nom + CP (restreint aux sources
  // sortantes pour ne pas heurter un lead entrant démo/contact homonyme).
  if (siret) {
    const dup = await prisma.lead.findFirst({ where: { siret }, select: { id: true } });
    if (dup) return { error: "Un prospect avec ce SIRET existe déjà." };
  } else if (codePostal) {
    const dup = await prisma.lead.findFirst({
      where: {
        organisme: nomOF,
        codePostal,
        source: { in: ["prospection-securite", "prospection-transport", "manuel"] },
      },
      select: { id: true },
    });
    if (dup) return { error: "Un prospect avec ce nom et ce code postal existe déjà." };
  }

  const lead = await prisma.lead.create({
    data: {
      nom: nomOF,
      organisme: nomOF,
      email,
      telephone: str(formData, "telephone") || null,
      representantLegal: str(formData, "representantLegal") || null,
      verticale,
      region: region || null,
      departement: departement || null,
      codePostal,
      ville: str(formData, "ville") || null,
      adresse: str(formData, "adresse") || null,
      siteWeb: str(formData, "siteWeb") || null,
      siret,
      typeFormation: str(formData, "typeFormation") || null,
      agrement: str(formData, "agrement") || null,
      priorite: normalizePriorite(str(formData, "priorite")),
      statut: statut as LeadStatut,
      prochaineAction: str(formData, "prochaineAction") || null,
      notes: str(formData, "notes") || null,
      sourceRemarques: str(formData, "sourceRemarques") || null,
      source: "manuel",
      lu: true,
    },
    select: { id: true },
  });
  await logLeadEvent(lead.id, "creation", { meta: { source: "manuel" } });

  revalidatePath("/console/prospects");
  revalidatePath("/console");
  return { ok: true };
}

/** Supprime un lead. */
export async function deleteLead(id: string): Promise<void> {
  const actor = await requireSuperAdmin();
  await prisma.lead.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { userId: actor!.user!.id as string, action: "DELETE", entityType: "Lead", entityId: id },
  });
  revalidatePath("/console/prospects");
  revalidatePath("/console");
}

/** Crédite un pack SMS prépayé sur le solde d'un organisme. SUPERADMIN. */
export async function crediterSmsPack(
  organismeId: string,
  packKey: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireSuperAdmin();
  const pack = smsPackByKey(packKey);
  if (!pack) return { ok: false, error: "Pack SMS inconnu." };
  await prisma.organisme.update({
    where: { id: organismeId },
    data: { smsSolde: { increment: pack.sms } },
  });
  revalidatePath(`/console/${organismeId}`);
  return { ok: true };
}

export type ConvertLeadResult = {
  ok: boolean;
  organismeId?: string;
  mode?: "demo_promue" | "creation";
  error?: string;
};

/**
 * Convertit un prospect en CLIENT en un clic — fin de la double saisie :
 *  • s'il a un tenant démo → on le PROMEUT en client réel (données + accès du
 *    prospect conservés : on retire simplement le flag démo et l'expiration) ;
 *  • sinon → on CRÉE une instance client pré-remplie depuis le lead.
 * Marque le lead CONVERTI, journalise l'événement (score +30) et renvoie
 * l'organisme cible (le SUPERADMIN atterrit sur sa configuration).
 */
export async function convertLeadToClient(leadId: string): Promise<ConvertLeadResult> {
  await requireSuperAdmin();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Prospect introuvable." };

  // Tenant démo lié encore présent ? → on le promeut plutôt que d'en recréer un.
  const demo = lead.demoOrganismeId
    ? await prisma.organisme.findUnique({
        where: { id: lead.demoOrganismeId },
        select: { id: true, nom: true },
      })
    : null;

  let organismeId: string;
  let mode: "demo_promue" | "creation";

  if (demo) {
    await prisma.organisme.update({
      where: { id: demo.id },
      data: {
        isDemo: false,
        demoHardExpiresAt: null,
        statut: OrganismeStatut.ESSAI,
        // Nettoie le préfixe « DÉMO — » du nom de démonstration.
        nom: demo.nom.replace(/^D[ÉE]MO\s*—\s*/i, "").trim() || demo.nom,
      },
    });
    organismeId = demo.id;
    mode = "demo_promue";
  } else {
    const nomBase = (lead.organisme?.trim() || lead.nom?.trim() || "Nouveau client").slice(0, 80);
    const org = await prisma.organisme.create({
      data: {
        nom: nomBase,
        email: lead.email || null,
        statut: OrganismeStatut.ESSAI,
        fonctionnalites: CORE_FEATURE_KEYS,
        sousDomaine: await uniqueSubdomain(nomBase),
        design: "defaut",
        couleurPrimaire: "#2C53C0",
      },
      select: { id: true },
    });
    organismeId = org.id;
    mode = "creation";
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { statut: LeadStatut.SIGNE, lu: true },
  });
  await logLeadEvent(leadId, "conversion", {
    titre: mode === "demo_promue" ? "Converti en client (démo promue)" : "Converti en client",
    meta: { organismeId, mode },
  });

  revalidatePath("/console/prospects");
  revalidatePath(`/console/prospects/${leadId}`);
  revalidatePath("/console/organismes");
  revalidatePath("/console");
  return { ok: true, organismeId, mode };
}
