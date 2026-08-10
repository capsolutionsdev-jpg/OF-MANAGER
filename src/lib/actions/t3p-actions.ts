"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { T3PMetier } from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import {
  T3P_FRAIS_EXAMEN,
  T3P_FRAIS_MOBILITE,
  T3P_MAX_TENTATIVES_PRATIQUE,
  theorieAdmise,
  tentativesPratiqueConsommees,
} from "@/lib/t3p";

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

// Date « YYYY-MM-DD » (input type=date) — chaîne vide = effacer (null).
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional();
const toDate = (s: string | undefined) => (s === undefined ? undefined : s === "" ? null : new Date(s));
const clean = (s?: string) => (s === undefined ? undefined : s.trim() === "" ? null : s.trim());

function revalidateParcours(candidatId: string) {
  revalidatePath(`/candidats/${candidatId}/parcours-t3p`);
  revalidatePath(`/candidats/${candidatId}`);
  revalidatePath("/parcours-t3p");
}

// ─────────────────────────────────────────────────────────────
//  Création du parcours
// ─────────────────────────────────────────────────────────────

/**
 * Crée le parcours T3P d'un candidat pour un métier (Taxi ou VTC) s'il
 * n'existe pas déjà — sinon retourne l'existant (et le rattache à
 * l'inscription fournie s'il n'en avait pas).
 */
export async function creerParcoursT3P(
  candidatId: string,
  metier: T3PMetier,
  opts?: { mobilite?: boolean; inscriptionId?: string },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();

  try {
    const existant = await db.parcoursT3P.findFirst({
      where: { candidatId, metier },
    });
    if (existant) {
      if (opts?.inscriptionId && !existant.inscriptionId) {
        await db.parcoursT3P.update({
          where: { id: existant.id },
          data: { inscriptionId: opts.inscriptionId },
        });
      }
      revalidateParcours(candidatId);
      return { ok: true, id: existant.id };
    }

    const mobilite = !!opts?.mobilite;
    const created = await db.parcoursT3P.create({
      data: {
        candidatId,
        metier,
        mobilite,
        inscriptionId: opts?.inscriptionId ?? null,
        fraisMontant: mobilite ? T3P_FRAIS_MOBILITE : T3P_FRAIS_EXAMEN,
      },
    });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "ParcoursT3P",
        entityId: created.id,
      },
    });
    revalidateParcours(candidatId);
    return { ok: true, id: created.id };
  } catch (e) {
    console.error("creerParcoursT3P:", e);
    return { ok: false, error: "Création du parcours impossible." };
  }
}

// ─────────────────────────────────────────────────────────────
//  Mise à jour des étapes du parcours
// ─────────────────────────────────────────────────────────────

const parcoursPatchSchema = z.object({
  statut: z.enum(["EN_COURS", "REUSSI", "ABANDONNE"]).optional(),
  mobilite: z.boolean().optional(),
  // Étape 1 — prérequis & dossier
  permisBDate: dateStr,
  conduiteAccompagnee: z.boolean().optional(),
  permisVerifieLe: dateStr,
  casierVerifieLe: dateStr,
  psc1VerifieLe: dateStr,
  medicalDate: dateStr,
  medicalVerifieLe: dateStr,
  dossierCompletLe: dateStr,
  // Étape 2 — CMA
  cmaDepartement: z.string().max(120).optional(),
  cmaNumeroDossier: z.string().max(120).optional(),
  cmaInscritLe: dateStr,
  // Étape 3 — frais
  fraisMontant: z.string().max(20).optional(), // saisie libre "241" / "241,00"
  fraisPayesLe: dateStr,
  fraisAvancesParOF: z.boolean().optional(),
  // Jalons formation
  formationTheoriqueFaiteLe: dateStr,
  formationPratiqueFaiteLe: dateStr,
  // Admissibilité (départ des délais réglementaires)
  admissibiliteLe: dateStr,
  // Étape 11 — carte professionnelle
  carteProDemandeeLe: dateStr,
  carteProObtenueLe: dateStr,
  carteProNumero: z.string().max(120).optional(),
  commentaire: z.string().max(4000).optional(),
});

export type ParcoursT3PPatch = z.infer<typeof parcoursPatchSchema>;

/** Met à jour les champs d'étapes d'un parcours (saisie console). */
export async function majParcoursT3P(id: string, patch: ParcoursT3PPatch): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();

  const parsed = parcoursPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const v = parsed.data;

  const fraisMontant =
    v.fraisMontant === undefined
      ? undefined
      : v.fraisMontant.trim() === ""
        ? null
        : Number(v.fraisMontant.replace(",", "."));
  if (fraisMontant !== undefined && fraisMontant !== null && Number.isNaN(fraisMontant)) {
    return { ok: false, error: "Montant des frais invalide." };
  }

  try {
    const parcours = await db.parcoursT3P.findUnique({ where: { id } });
    if (!parcours) return { ok: false, error: "Parcours introuvable." };

    await db.parcoursT3P.update({
      where: { id },
      data: {
        statut: v.statut,
        mobilite: v.mobilite,
        permisBDate: toDate(v.permisBDate),
        conduiteAccompagnee: v.conduiteAccompagnee,
        permisVerifieLe: toDate(v.permisVerifieLe),
        casierVerifieLe: toDate(v.casierVerifieLe),
        psc1VerifieLe: toDate(v.psc1VerifieLe),
        medicalDate: toDate(v.medicalDate),
        medicalVerifieLe: toDate(v.medicalVerifieLe),
        dossierCompletLe: toDate(v.dossierCompletLe),
        cmaDepartement: clean(v.cmaDepartement),
        cmaNumeroDossier: clean(v.cmaNumeroDossier),
        cmaInscritLe: toDate(v.cmaInscritLe),
        fraisMontant,
        fraisPayesLe: toDate(v.fraisPayesLe),
        fraisAvancesParOF: v.fraisAvancesParOF,
        formationTheoriqueFaiteLe: toDate(v.formationTheoriqueFaiteLe),
        formationPratiqueFaiteLe: toDate(v.formationPratiqueFaiteLe),
        admissibiliteLe: toDate(v.admissibiliteLe),
        carteProDemandeeLe: toDate(v.carteProDemandeeLe),
        carteProObtenueLe: toDate(v.carteProObtenueLe),
        carteProNumero: clean(v.carteProNumero),
        commentaire: clean(v.commentaire),
      },
    });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "ParcoursT3P",
        entityId: id,
        changesJson: JSON.parse(JSON.stringify(v)),
      },
    });
    revalidateParcours(parcours.candidatId);
    return { ok: true, id };
  } catch (e) {
    console.error("majParcoursT3P:", e);
    return { ok: false, error: "Mise à jour impossible." };
  }
}

// ─────────────────────────────────────────────────────────────
//  Épreuves CMA (théorie / pratique, une ligne par présentation)
// ─────────────────────────────────────────────────────────────

/**
 * Ouvre une nouvelle présentation à une épreuve. Règles :
 *  - PRATIQUE : théorie admise obligatoire, 3 présentations max ;
 *  - une seule présentation « en attente » à la fois par type.
 */
export async function ajouterEpreuveT3P(
  parcoursId: string,
  type: "THEORIE" | "PRATIQUE",
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();

  try {
    const parcours = await db.parcoursT3P.findUnique({
      where: { id: parcoursId },
      include: { epreuves: true },
    });
    if (!parcours) return { ok: false, error: "Parcours introuvable." };

    const duType = parcours.epreuves.filter((e) => e.type === type);
    if (duType.some((e) => e.resultat === "EN_ATTENTE")) {
      return { ok: false, error: "Une présentation est déjà en attente de résultat pour cette épreuve." };
    }
    if (type === "PRATIQUE") {
      if (!theorieAdmise(parcours)) {
        return { ok: false, error: "L'épreuve pratique exige l'admissibilité (théorie admise)." };
      }
      if (tentativesPratiqueConsommees(parcours) >= T3P_MAX_TENTATIVES_PRATIQUE) {
        return { ok: false, error: "3 présentations à l'admission déjà consommées (règlement CMA)." };
      }
    }
    if (type === "THEORIE" && duType.some((e) => e.resultat === "ADMIS")) {
      return { ok: false, error: "La théorie est déjà admise." };
    }

    const tentative = duType.length > 0 ? Math.max(...duType.map((e) => e.tentative)) + 1 : 1;
    const created = await db.t3PEpreuve.create({
      data: { parcoursId, type, tentative },
    });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "T3PEpreuve",
        entityId: created.id,
      },
    });
    revalidateParcours(parcours.candidatId);
    return { ok: true, id: created.id };
  } catch (e) {
    console.error("ajouterEpreuveT3P:", e);
    return { ok: false, error: "Ajout de l'épreuve impossible." };
  }
}

const epreuvePatchSchema = z.object({
  convocationRecueLe: dateStr,
  date: dateStr,
  resultat: z.enum(["EN_ATTENTE", "ADMIS", "AJOURNE", "ABSENT"]).optional(),
  resultatLe: dateStr,
  note: z.string().max(40).optional(),
  commentaire: z.string().max(1000).optional(),
});

export type EpreuveT3PPatch = z.infer<typeof epreuvePatchSchema>;

/**
 * Met à jour une présentation (convocation, date, résultat…).
 * Effets de bord réglementaires :
 *  - THEORIE admise → fixe la date d'admissibilité du parcours (départ du
 *    délai d'1 an / 3 présentations) si absente ;
 *  - PRATIQUE admise → parcours « Réussi » + synchronise le résultat de
 *    certification de l'inscription liée (BPF / taux de réussite Qualiopi).
 */
export async function majEpreuveT3P(epreuveId: string, patch: EpreuveT3PPatch): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();

  const parsed = epreuvePatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const v = parsed.data;

  try {
    const epreuve = await db.t3PEpreuve.findUnique({
      where: { id: epreuveId },
      include: { parcours: true },
    });
    if (!epreuve) return { ok: false, error: "Épreuve introuvable." };

    const updated = await db.t3PEpreuve.update({
      where: { id: epreuveId },
      data: {
        convocationRecueLe: toDate(v.convocationRecueLe),
        date: toDate(v.date),
        resultat: v.resultat,
        resultatLe: toDate(v.resultatLe),
        note: clean(v.note),
        commentaire: clean(v.commentaire),
      },
    });

    // Effets de bord sur le parcours.
    if (updated.type === "THEORIE" && updated.resultat === "ADMIS" && !epreuve.parcours.admissibiliteLe) {
      await db.parcoursT3P.update({
        where: { id: epreuve.parcoursId },
        data: { admissibiliteLe: updated.resultatLe ?? new Date() },
      });
    }
    if (updated.type === "PRATIQUE" && updated.resultat === "ADMIS") {
      await db.parcoursT3P.update({
        where: { id: epreuve.parcoursId },
        data: { statut: "REUSSI" },
      });
      if (epreuve.parcours.inscriptionId) {
        // Ne pas écraser un résultat déjà saisi manuellement.
        const insc = await db.inscription.findUnique({
          where: { id: epreuve.parcours.inscriptionId },
          select: { resultatCertification: true },
        });
        if (insc && insc.resultatCertification === "NON_EVALUE") {
          await db.inscription.update({
            where: { id: epreuve.parcours.inscriptionId },
            data: {
              resultatCertification: "CERTIFIE",
              certificationDate: updated.resultatLe ?? new Date(),
            },
          });
        }
      }
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "T3PEpreuve",
        entityId: epreuveId,
        changesJson: JSON.parse(JSON.stringify(v)),
      },
    });
    revalidateParcours(epreuve.parcours.candidatId);
    return { ok: true, id: epreuveId };
  } catch (e) {
    console.error("majEpreuveT3P:", e);
    return { ok: false, error: "Mise à jour de l'épreuve impossible." };
  }
}

// ─────────────────────────────────────────────────────────────
//  Validation manuelle des étapes par les collaborateurs (Qualiopi)
// ─────────────────────────────────────────────────────────────

// Clés d'étapes autorisées (cf. lib/t3p → parcoursEtapes). Garde-fou : on ne
// valide qu'une étape connue.
const ETAPE_KEYS = new Set([
  "prerequis",
  "cma",
  "frais",
  "convoc-theorie",
  "formation-theorie",
  "resultat-theorie",
  "convoc-pratique",
  "formation-pratique",
  "examen-pratique",
  "resultat-pratique",
  "carte-pro",
]);

/**
 * Pose (ou remplace) le visa d'un collaborateur sur une étape du parcours :
 * enregistre son nom, son id et l'horodatage (+ commentaire optionnel).
 * Traçabilité Qualiopi — indépendant du statut calculé de l'étape.
 */
export async function validerEtapeT3P(
  parcoursId: string,
  etapeKey: string,
  comment?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  if (!ETAPE_KEYS.has(etapeKey)) return { ok: false, error: "Étape inconnue." };
  const db = await getTenantDb();

  try {
    const parcours = await db.parcoursT3P.findUnique({
      where: { id: parcoursId },
      select: { candidatId: true, etapesValidation: true, inscription: { select: { sessionId: true } } },
    });
    if (!parcours) return { ok: false, error: "Parcours introuvable." };

    const nom = session.user.name || session.user.email || "Collaborateur";
    const visas =
      parcours.etapesValidation && typeof parcours.etapesValidation === "object"
        ? { ...(parcours.etapesValidation as Record<string, unknown>) }
        : {};
    const cleaned = comment?.trim();
    visas[etapeKey] = {
      nom,
      userId: session.user.id,
      date: new Date().toISOString(),
      ...(cleaned ? { comment: cleaned } : {}),
    };

    await db.parcoursT3P.update({
      where: { id: parcoursId },
      data: { etapesValidation: visas },
    });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VALIDATE_ETAPE",
        entityType: "ParcoursT3P",
        entityId: parcoursId,
        changesJson: { etape: etapeKey },
      },
    });
    revalidateParcours(parcours.candidatId);
    if (parcours.inscription?.sessionId) {
      revalidatePath(`/sessions/${parcours.inscription.sessionId}/parcours-t3p`);
    }
    return { ok: true, id: parcoursId };
  } catch (e) {
    console.error("validerEtapeT3P:", e);
    return { ok: false, error: "Validation impossible." };
  }
}

/** Retire le visa d'une étape (annulation de validation). */
export async function annulerValidationEtapeT3P(parcoursId: string, etapeKey: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  if (!ETAPE_KEYS.has(etapeKey)) return { ok: false, error: "Étape inconnue." };
  const db = await getTenantDb();

  try {
    const parcours = await db.parcoursT3P.findUnique({
      where: { id: parcoursId },
      select: { candidatId: true, etapesValidation: true, inscription: { select: { sessionId: true } } },
    });
    if (!parcours) return { ok: false, error: "Parcours introuvable." };

    const visas =
      parcours.etapesValidation && typeof parcours.etapesValidation === "object"
        ? { ...(parcours.etapesValidation as Record<string, unknown>) }
        : {};
    delete visas[etapeKey];

    await db.parcoursT3P.update({
      where: { id: parcoursId },
      data: { etapesValidation: visas },
    });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UNVALIDATE_ETAPE",
        entityType: "ParcoursT3P",
        entityId: parcoursId,
        changesJson: { etape: etapeKey },
      },
    });
    revalidateParcours(parcours.candidatId);
    if (parcours.inscription?.sessionId) {
      revalidatePath(`/sessions/${parcours.inscription.sessionId}/parcours-t3p`);
    }
    return { ok: true, id: parcoursId };
  } catch (e) {
    console.error("annulerValidationEtapeT3P:", e);
    return { ok: false, error: "Annulation impossible." };
  }
}

/** Supprime une présentation saisie par erreur (correction). */
export async function supprimerEpreuveT3P(epreuveId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();

  try {
    const epreuve = await db.t3PEpreuve.findUnique({
      where: { id: epreuveId },
      include: { parcours: { select: { candidatId: true } } },
    });
    if (!epreuve) return { ok: false, error: "Épreuve introuvable." };

    await db.t3PEpreuve.delete({ where: { id: epreuveId } });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "T3PEpreuve",
        entityId: epreuveId,
      },
    });
    revalidateParcours(epreuve.parcours.candidatId);
    return { ok: true, id: epreuveId };
  } catch (e) {
    console.error("supprimerEpreuveT3P:", e);
    return { ok: false, error: "Suppression impossible." };
  }
}
