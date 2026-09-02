"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { relanceParcours } from "@/lib/actions/parcours-actions";

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
          create: inscriptionIds.map((iid) => ({ inscriptionId: iid })),
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
