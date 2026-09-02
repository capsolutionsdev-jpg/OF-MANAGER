"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { relanceParcours } from "@/lib/actions/parcours-actions";
import { sendAutomationEventNow } from "@/lib/actions/manual-send-actions";
import { createApprenantAccount } from "@/lib/actions/apprenant-actions";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import { generateToken, appBaseUrl } from "@/lib/token";
import { emailShell, emailParagraph, emailButton, emailBox, emailSignoff, emailLogoSrc, esc } from "@/lib/email-templates";
import { EmailStatut } from "@prisma/client";

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);

function revalidateAudit(id?: string) {
  revalidatePath("/audit");
  if (id) revalidatePath(`/audit/${id}`);
}

const creerSchema = z.object({
  type: z.enum(["INTERNE", "CONTROLE", "ALEATOIRE"]),
  perimetre: z.enum(["SESSION", "DOSSIER"]),
  sessionId: z.string().trim().optional(),
  inscriptionId: z.string().trim().optional(),
  titre: z.string().trim().max(200).optional(),
});

export type CreerAuditInput = z.infer<typeof creerSchema>;

/**
 * Crée un audit et rattache les dossiers concernés.
 * - SESSION : tous les inscrits (hors annulés) de la session.
 * - DOSSIER : l'inscription ciblée.
 * - type ALEATOIRE : si aucune session fournie, en tire une au hasard.
 */
export async function creerAudit(input: CreerAuditInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const parsed = creerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const v = parsed.data;
  const db = await getTenantDb();

  try {
    let sessionId = clean(v.sessionId);
    const inscriptionId = clean(v.inscriptionId);
    let perimetre = v.perimetre;

    // Tirage aléatoire d'une session si demandé sans cible.
    if (v.type === "ALEATOIRE" && !sessionId && !inscriptionId) {
      const sessions = await db.session.findMany({
        where: { statut: { not: "ANNULEE" } },
        select: { id: true },
      });
      if (sessions.length === 0) return { ok: false, error: "Aucune session à auditer." };
      sessionId = sessions[Math.floor(Math.random() * sessions.length)].id;
      perimetre = "SESSION";
    }

    // Résolution du périmètre → liste d'inscriptions + libellé.
    let inscriptionIds: string[] = [];
    let titre = clean(v.titre) ?? "";

    if (perimetre === "DOSSIER") {
      if (!inscriptionId) return { ok: false, error: "Sélectionnez un dossier." };
      const insc = await db.inscription.findUnique({
        where: { id: inscriptionId },
        select: { id: true, sessionId: true, candidat: { select: { nom: true, prenom: true } } },
      });
      if (!insc) return { ok: false, error: "Dossier introuvable." };
      inscriptionIds = [insc.id];
      sessionId = insc.sessionId;
      if (!titre) titre = `Dossier — ${insc.candidat.prenom} ${insc.candidat.nom}`;
    } else {
      if (!sessionId) return { ok: false, error: "Sélectionnez une session." };
      const sess = await db.session.findUnique({
        where: { id: sessionId },
        select: {
          reference: true,
          dateDebut: true,
          formation: { select: { titre: true } },
          inscriptions: { where: { statut: { not: "ANNULEE" } }, select: { id: true } },
        },
      });
      if (!sess) return { ok: false, error: "Session introuvable." };
      inscriptionIds = sess.inscriptions.map((i) => i.id);
      if (!titre) {
        const d = sess.dateDebut.toLocaleDateString("fr-FR");
        titre = `${sess.formation.titre} — ${d}`;
      }
    }

    const audit = await db.auditControle.create({
      data: {
        type: v.type,
        perimetre,
        sessionId,
        titre,
        responsableNom: session.user.name || session.user.email || null,
        createdById: session.user.id,
        dossiers: {
          // organismeId posé EXPLICITEMENT : l'injection tenant ne couvre pas les
          // créations imbriquées → sans lui, le dossier serait invisible ensuite.
          create: inscriptionIds.map((iid) => ({ inscriptionId: iid, organismeId: session.user.organismeId ?? null })),
        },
      },
    });
    await db.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entityType: "AuditControle", entityId: audit.id },
    });
    revalidateAudit(audit.id);
    return { ok: true, id: audit.id };
  } catch (e) {
    console.error("creerAudit:", e);
    return { ok: false, error: "Création de l'audit impossible." };
  }
}

/** Relance par e-mail le candidat d'un dossier (renvoi du lien parcours). */
export async function relancerDossierAudit(dossierId: string): Promise<ActionResult & { demo?: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  try {
    const d = await db.auditControleDossier.findUnique({
      where: { id: dossierId },
      select: { id: true, auditId: true, inscriptionId: true },
    });
    if (!d) return { ok: false, error: "Dossier introuvable." };

    const res = await relanceParcours(d.inscriptionId);
    if (!res.ok) return { ok: false, error: res.error ?? "Relance impossible." };

    await db.auditControleDossier.update({
      where: { id: dossierId },
      data: { relanceSentAt: new Date(), relanceCount: { increment: 1 }, statut: "EN_COURS" },
    });
    revalidateAudit(d.auditId);
    return { ok: true, id: dossierId, demo: res.demo };
  } catch (e) {
    console.error("relancerDossierAudit:", e);
    return { ok: false, error: "Relance impossible." };
  }
}

// ─────────────────────────────────────────────────────────────
//  Visa manuel par élément de checklist + relance ciblée
// ─────────────────────────────────────────────────────────────

/** Pose un visa manuel « fait / présent » sur un élément de la checklist. */
export async function validerCheckAudit(dossierId: string, checkKey: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  if (!checkKey || checkKey.length > 120) return { ok: false, error: "Élément invalide." };
  const db = await getTenantDb();
  try {
    const d = await db.auditControleDossier.findUnique({ where: { id: dossierId }, select: { auditId: true, validations: true } });
    if (!d) return { ok: false, error: "Dossier introuvable." };
    const v = d.validations && typeof d.validations === "object" ? { ...(d.validations as Record<string, unknown>) } : {};
    v[checkKey] = { nom: session.user.name || session.user.email || "Collaborateur", date: new Date().toISOString() };
    await db.auditControleDossier.update({ where: { id: dossierId }, data: { validations: v } });
    revalidateAudit(d.auditId);
    return { ok: true, id: dossierId };
  } catch (e) {
    console.error("validerCheckAudit:", e);
    return { ok: false, error: "Validation impossible." };
  }
}

/** Retire le visa manuel d'un élément. */
export async function annulerCheckAudit(dossierId: string, checkKey: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  try {
    const d = await db.auditControleDossier.findUnique({ where: { id: dossierId }, select: { auditId: true, validations: true } });
    if (!d) return { ok: false, error: "Dossier introuvable." };
    const v = d.validations && typeof d.validations === "object" ? { ...(d.validations as Record<string, unknown>) } : {};
    delete v[checkKey];
    await db.auditControleDossier.update({ where: { id: dossierId }, data: { validations: v } });
    revalidateAudit(d.auditId);
    return { ok: true, id: dossierId };
  } catch (e) {
    console.error("annulerCheckAudit:", e);
    return { ok: false, error: "Annulation impossible." };
  }
}

/** Relance ciblée d'un élément (document dépendant du candidat). */
export async function relancerCheckAudit(dossierId: string, checkKey: string): Promise<ActionResult & { demo?: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  try {
    const d = await db.auditControleDossier.findUnique({ where: { id: dossierId }, select: { auditId: true, inscriptionId: true } });
    if (!d) return { ok: false, error: "Dossier introuvable." };

    const insc = await db.inscription.findUnique({ where: { id: d.inscriptionId }, select: { session: { select: { dateFin: true } } } });
    const dateFin = insc?.session?.dateFin ?? null;
    const now = new Date();

    // Détermine le type de relance depuis la clé de l'élément.
    const kind =
      checkKey === "signatures" || checkKey.startsWith("piece::") ? "parcours"
        : checkKey === "positionnement" ? "positionnement"
        : checkKey === "convocation" ? "convocation"
        : checkKey === "satisfaction" ? "satisfaction"
        : checkKey === "docs_fin" ? "docs_fin"
        : null;
    if (!kind) return { ok: false, error: "Cet élément n'a pas de relance automatique (à cocher manuellement)." };

    // Garde chronologique : satisfaction / documents de fin uniquement après la fin.
    if ((kind === "satisfaction" || kind === "docs_fin") && dateFin && dateFin > now) {
      return { ok: false, error: "La formation n'est pas terminée : cette relance sera possible après la date de fin." };
    }

    let res: { ok: boolean; error?: string; demo?: boolean };
    if (kind === "parcours") {
      res = await relanceParcours(d.inscriptionId);
    } else {
      res = await sendAutomationEventNow(d.inscriptionId, kind);
    }
    if (!res.ok) return { ok: false, error: res.error ?? "Relance impossible." };

    await db.auditControleDossier.update({
      where: { id: dossierId },
      data: { relanceSentAt: new Date(), relanceCount: { increment: 1 }, statut: "EN_COURS" },
    });
    revalidateAudit(d.auditId);
    return { ok: true, id: dossierId, demo: (res as { demo?: boolean }).demo };
  } catch (e) {
    console.error("relancerCheckAudit:", e);
    return { ok: false, error: "Relance impossible." };
  }
}

// ─────────────────────────────────────────────────────────────
//  Compte candidat : création + envoi des identifiants (manuel)
// ─────────────────────────────────────────────────────────────

/** Mot de passe provisoire aléatoire, lisible (pas d'ambiguïté 0/O, 1/l). */
function motDePasseProvisoire(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `CAP-${s}`;
}

/**
 * Crée (ou réinitialise) le compte candidat et lui envoie ses identifiants.
 * - mot de passe provisoire aléatoire + changement OBLIGATOIRE au 1er login ;
 * - génère les liens manquants (parcours, positionnement, satisfaction, suivi 6 mois)
 *   pour que TOUT soit accessible depuis le compte ;
 * - trace l'envoi sur le dossier d'audit (compteSentAt / compteSentCount).
 * Si les e-mails du tenant sont suspendus, rien ne part (l'envoi est journalisé).
 */
export async function envoyerIdentifiantsAudit(dossierId: string): Promise<ActionResult & { suspendu?: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  try {
    const d = await db.auditControleDossier.findUnique({
      where: { id: dossierId },
      select: { auditId: true, inscriptionId: true },
    });
    if (!d) return { ok: false, error: "Dossier introuvable." };

    const i = await db.inscription.findUnique({
      where: { id: d.inscriptionId },
      select: {
        id: true, organismeId: true, accessToken: true, positionnementToken: true,
        satisfactionToken: true, suivi6moisToken: true,
        candidat: { select: { id: true, nom: true, prenom: true, email: true } },
        session: { select: { formation: { select: { titre: true } } } },
      },
    });
    if (!i) return { ok: false, error: "Inscription introuvable." };
    const to = i.candidat.email;
    if (!to || !to.includes("@")) return { ok: false, error: "Le candidat n'a pas d'e-mail valide." };

    // 1) Compte : mdp provisoire aléatoire + changement forcé au 1er login.
    const password = motDePasseProvisoire();
    const res = await createApprenantAccount(i.candidat.id, password);
    if (!res.ok) return { ok: false, error: res.error ?? "Création du compte impossible." };
    const apprenant = await prisma.apprenant.findUnique({ where: { candidatId: i.candidat.id }, select: { userId: true } });
    if (apprenant?.userId) {
      await prisma.user.update({ where: { id: apprenant.userId }, data: { mustChangePassword: true } });
    }

    // 2) Liens manquants → tout est accessible depuis le compte.
    const patch: Record<string, string> = {};
    if (!i.accessToken) patch.accessToken = generateToken();
    if (!i.positionnementToken) patch.positionnementToken = generateToken();
    if (!i.satisfactionToken) patch.satisfactionToken = generateToken();
    if (!i.suivi6moisToken) patch.suivi6moisToken = generateToken();
    if (Object.keys(patch).length) await db.inscription.update({ where: { id: i.id }, data: patch });

    // 3) E-mail d'identifiants.
    const org = await orgConfigFor(i.organismeId);
    const loginUrl = `${appBaseUrl()}/login`;
    const prenom = i.candidat.prenom;
    const html = emailShell({
      organisme: org.name,
      representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
      body:
        emailParagraph(`Bonjour ${esc(prenom)},`) +
        emailParagraph(
          `${esc(org.name)} met à votre disposition un <b>espace personnel en ligne</b> pour votre formation <b>« ${esc(i.session.formation.titre)} »</b>. Vous y trouverez tous vos documents à lire et à signer, votre test de positionnement et vos questionnaires.`,
        ) +
        emailBox(
          `🔑 <b>Vos identifiants de connexion</b><br/>Identifiant : <b>${esc(to)}</b><br/>Mot de passe provisoire : <b>${esc(password)}</b><br/><i>Un nouveau mot de passe vous sera demandé à la première connexion.</i>`,
        ) +
        emailButton("Accéder à mon espace", loginUrl) +
        emailParagraph(
          `Une fois connecté, ouvrez « Mes documents » : vous pourrez tout consulter, remplir et signer au même endroit.`,
        ) +
        (org.telephone ? emailParagraph(`Besoin d'aide ? Appelez-nous au <b>${esc(org.telephone)}</b>.`) : "") +
        emailSignoff("Cordialement,", org.representant),
    });
    const sent = await sendEmail({
      to,
      subject: `Vos identifiants — espace personnel ${org.name}`,
      html,
      organismeId: i.organismeId,
      manuel: true,
    });
    await prisma.emailLog.create({
      data: {
        organismeId: i.organismeId,
        destinataire: to,
        sujet: `Vos identifiants — espace personnel ${org.name}`,
        corps: html,
        statut: sent.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
        sentAt: sent.sent ? new Date() : null,
      },
    });

    // 4) Suivi sur le dossier d'audit.
    await db.auditControleDossier.update({
      where: { id: dossierId },
      data: { compteSentAt: new Date(), compteSentCount: { increment: 1 } },
    });
    revalidateAudit(d.auditId);
    return { ok: true, id: dossierId, suspendu: !sent.sent };
  } catch (e) {
    console.error("envoyerIdentifiantsAudit:", e);
    return { ok: false, error: "Envoi impossible." };
  }
}

/** Envoie les identifiants à TOUS les dossiers de l'audit (sans compte envoyé ou tous si `retous`). */
export async function envoyerIdentifiantsAuditEnMasse(
  auditId: string,
  retous = false,
): Promise<{ ok: true; envoyes: number; erreurs: string[] } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  try {
    const dossiers = await db.auditControleDossier.findMany({
      where: { auditId, ...(retous ? {} : { compteSentAt: null }) },
      select: { id: true },
    });
    let envoyes = 0;
    const erreurs: string[] = [];
    for (const d of dossiers) {
      const r = await envoyerIdentifiantsAudit(d.id);
      if (r.ok) envoyes++;
      else erreurs.push(r.error);
    }
    return { ok: true, envoyes, erreurs };
  } catch (e) {
    console.error("envoyerIdentifiantsAuditEnMasse:", e);
    return { ok: false, error: "Envoi en masse impossible." };
  }
}

// ─────────────────────────────────────────────────────────────
//  Visa manuel des documents Qualiopi de la SESSION (rubrique 1)
// ─────────────────────────────────────────────────────────────

/** Pose un visa manuel « fait / présent » sur un document Qualiopi de la session. */
export async function validerSessionCheck(auditId: string, checkKey: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  if (!checkKey || checkKey.length > 120) return { ok: false, error: "Élément invalide." };
  const db = await getTenantDb();
  try {
    const a = await db.auditControle.findUnique({ where: { id: auditId }, select: { sessionValidations: true } });
    if (!a) return { ok: false, error: "Audit introuvable." };
    const v = a.sessionValidations && typeof a.sessionValidations === "object" ? { ...(a.sessionValidations as Record<string, unknown>) } : {};
    v[checkKey] = { nom: session.user.name || session.user.email || "Collaborateur", date: new Date().toISOString() };
    await db.auditControle.update({ where: { id: auditId }, data: { sessionValidations: v } });
    revalidateAudit(auditId);
    return { ok: true, id: auditId };
  } catch (e) {
    console.error("validerSessionCheck:", e);
    return { ok: false, error: "Validation impossible." };
  }
}

/** Retire le visa manuel d'un document Qualiopi de la session. */
export async function annulerSessionCheck(auditId: string, checkKey: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  try {
    const a = await db.auditControle.findUnique({ where: { id: auditId }, select: { sessionValidations: true } });
    if (!a) return { ok: false, error: "Audit introuvable." };
    const v = a.sessionValidations && typeof a.sessionValidations === "object" ? { ...(a.sessionValidations as Record<string, unknown>) } : {};
    delete v[checkKey];
    await db.auditControle.update({ where: { id: auditId }, data: { sessionValidations: v } });
    revalidateAudit(auditId);
    return { ok: true, id: auditId };
  } catch (e) {
    console.error("annulerSessionCheck:", e);
    return { ok: false, error: "Annulation impossible." };
  }
}

/** Met à jour le suivi d'un dossier audité (statut / commentaire). */
export async function majDossierAudit(
  dossierId: string,
  patch: { statut?: "A_TRAITER" | "EN_COURS" | "CONFORME"; commentaire?: string },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  try {
    const d = await db.auditControleDossier.findUnique({ where: { id: dossierId }, select: { auditId: true } });
    if (!d) return { ok: false, error: "Dossier introuvable." };
    await db.auditControleDossier.update({
      where: { id: dossierId },
      data: {
        statut: patch.statut,
        commentaire: patch.commentaire === undefined ? undefined : clean(patch.commentaire),
        resolvedAt: patch.statut === "CONFORME" ? new Date() : patch.statut ? null : undefined,
      },
    });
    revalidateAudit(d.auditId);
    return { ok: true, id: dossierId };
  } catch (e) {
    console.error("majDossierAudit:", e);
    return { ok: false, error: "Mise à jour impossible." };
  }
}

/** Met à jour l'audit (statut / notes). */
export async function majAudit(
  id: string,
  patch: { statut?: "EN_COURS" | "TERMINE"; notes?: string; titre?: string },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  try {
    await db.auditControle.update({
      where: { id },
      data: {
        statut: patch.statut,
        notes: patch.notes === undefined ? undefined : clean(patch.notes),
        titre: patch.titre?.trim() || undefined,
      },
    });
    revalidateAudit(id);
    return { ok: true, id };
  } catch (e) {
    console.error("majAudit:", e);
    return { ok: false, error: "Mise à jour impossible." };
  }
}

/** Supprime un audit (et ses dossiers, en cascade). */
export async function supprimerAudit(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  try {
    await db.auditControle.delete({ where: { id } });
    await db.auditLog.create({
      data: { userId: session.user.id, action: "DELETE", entityType: "AuditControle", entityId: id },
    });
    revalidateAudit();
    return { ok: true, id };
  } catch (e) {
    console.error("supprimerAudit:", e);
    return { ok: false, error: "Suppression impossible." };
  }
}
