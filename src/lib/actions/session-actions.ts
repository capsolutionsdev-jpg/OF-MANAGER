"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireStaffTenant } from "@/lib/tenant";
import { auth } from "@/auth";
import {
  sessionFormSchema,
  type SessionFormValues,
} from "@/lib/validators/session";
import { hasStrictFeature } from "@/lib/feature-guard";
import { joursSession, joursEnConflit } from "@/lib/formateurs/animation";
import type { TenantDb } from "@/lib/tenant";

export type ActionResult =
  | { ok: true; id: string; warning?: string }
  | { ok: false; error: string };

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);

const eurosToCents = (v?: string) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

/**
 * Synchronise les jurés affectés à une session depuis le formulaire :
 * ajoute les nouveaux, met à jour prix/nature des existants (en PRÉSERVANT le
 * statut de paiement et l'envoi de la note), retire ceux décochés. Gardé par la
 * fonctionnalité `jurys` (sinon no-op).
 */
async function syncJuryAffectations(
  db: TenantDb,
  sessionId: string,
  jurys: NonNullable<SessionFormValues["jurys"]>,
) {
  if (!(await hasStrictFeature("jurys"))) return;
  const wanted = (jurys ?? []).filter((j) => j.juryId);
  const existing = await db.juryAffectation.findMany({
    where: { sessionId },
    select: { id: true, juryId: true },
  });
  const wantedIds = new Set(wanted.map((j) => j.juryId));

  // Retire les affectations décochées.
  const toRemove = existing.filter((e) => !wantedIds.has(e.juryId)).map((e) => e.id);
  if (toRemove.length) await db.juryAffectation.deleteMany({ where: { id: { in: toRemove } } });

  // Ajoute / met à jour.
  for (const j of wanted) {
    const ex = existing.find((e) => e.juryId === j.juryId);
    const data = {
      prixCents: eurosToCents(j.prixEuros),
      natureExamen: clean(j.natureExamen),
    };
    if (ex) {
      await db.juryAffectation.updateMany({ where: { id: ex.id }, data });
    } else {
      await db.juryAffectation.create({
        data: { sessionId, juryId: j.juryId, ...data },
      });
    }
  }
}

function toData(v: SessionFormValues) {
  const places =
    v.nbPlaces && v.nbPlaces.trim() !== "" ? parseInt(v.nbPlaces, 10) : 10;
  const tarif =
    v.tarifFormateurJour && v.tarifFormateurJour.trim() !== ""
      ? Number(v.tarifFormateurJour.replace(",", "."))
      : null;
  return {
    formationId: v.formationId,
    reference: clean(v.reference),
    dateDebut: new Date(v.dateDebut),
    dateFin: new Date(v.dateFin),
    horaires: clean(v.horaires),
    lieu: clean(v.lieu),
    dateExamen: v.dateExamen && v.dateExamen.trim() !== "" ? new Date(v.dateExamen) : null,
    lieuExamen: clean(v.lieuExamen),
    salleId: clean(v.salleId),
    modalite: v.modalite,
    nbPlaces: Number.isNaN(places) ? 10 : places,
    statut: v.statut,
    tarifFormateurJour: tarif !== null && !Number.isNaN(tarif) ? tarif : null,
  };
}

/**
 * Revalide côté serveur que la salle et les formateurs choisis appartiennent à
 * l'organisme (les FK scalaires ne sont PAS scopées par Prisma → un id d'un autre
 * tenant passerait sans ce contrôle). Salle inactive ou hors tenant → ignorée ;
 * formateurs hors tenant → filtrés.
 */
async function validateRefs(
  db: TenantDb,
  salleId: string | null,
  formateurIds: string[],
): Promise<{ salleId: string | null; salleCapacite: number | null; formateurIds: string[] }> {
  let validSalle: string | null = null;
  let salleCapacite: number | null = null;
  if (salleId) {
    const salle = await db.salle.findFirst({
      where: { id: salleId, actif: true },
      select: { id: true, capacite: true },
    });
    if (salle) {
      validSalle = salle.id;
      salleCapacite = salle.capacite;
    }
  }
  let validFormateurs = formateurIds;
  if (formateurIds.length) {
    const found = await db.formateur.findMany({ where: { id: { in: formateurIds } }, select: { id: true } });
    const ok = new Set(found.map((f) => f.id));
    validFormateurs = formateurIds.filter((fid) => ok.has(fid));
  }
  return { salleId: validSalle, salleCapacite, formateurIds: validFormateurs };
}

/**
 * Avertissements NON bloquants sur la salle (choix produit : avertir mais
 * autoriser) : sur-capacité (nbPlaces > capacité) et conflit de réservation
 * (une autre session non annulée occupe la même salle sur un créneau qui
 * chevauche). Renvoie un message unique ou undefined.
 */
async function salleWarnings(
  db: TenantDb,
  salleId: string | null,
  capacite: number | null,
  nbPlaces: number,
  dateDebut: Date,
  dateFin: Date,
  excludeSessionId?: string,
): Promise<string | undefined> {
  if (!salleId) return undefined;
  const parts: string[] = [];
  if (capacite != null && nbPlaces > capacite) {
    parts.push(`la capacité de la salle (${capacite} places) est dépassée (${nbPlaces} prévues)`);
  }
  // Chevauchement d'intervalles : debut ≤ finAutre ET finAutre... (a≤bEnd && b≤aEnd).
  const conflit = await db.session.findFirst({
    where: {
      salleId,
      statut: { not: "ANNULEE" },
      ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      dateDebut: { lte: dateFin },
      dateFin: { gte: dateDebut },
    },
    select: { reference: true, dateDebut: true, formation: { select: { titre: true } } },
  });
  if (conflit) {
    const d = conflit.dateDebut.toLocaleDateString("fr-FR");
    const nom = conflit.formation?.titre ?? conflit.reference ?? "une autre session";
    parts.push(`la salle est déjà réservée sur ce créneau (${nom} — ${d})`);
  }
  return parts.length ? `Attention : ${parts.join(" ; ")}.` : undefined;
}

/** JSON d'animation par formateur, filtré aux formateurs réellement affectés. */
function buildAnimation(
  anim: SessionFormValues["formateursAnimation"],
  validIds: string[],
): Prisma.InputJsonValue {
  const valid = new Set(validIds);
  return (anim ?? [])
    .filter((a) => valid.has(a.formateurId))
    .map((a) => ({ formateurId: a.formateurId, complet: a.complet, jours: a.complet ? [] : a.jours }));
}

/** Erreur si un même jour est attribué à ≥ 2 formateurs (un jour = un seul
 *  formateur ; « complet » = toute la session). null si tout va bien. */
function animationOverlap(
  anim: SessionFormValues["formateursAnimation"],
  validIds: string[],
  dateDebut: string,
  dateFin: string,
): string | null {
  const valid = new Set(validIds);
  const items = (anim ?? []).filter((a) => valid.has(a.formateurId));
  if (items.length < 2) return null;
  const conflit = joursEnConflit(
    items.map((a) => ({ formateurId: a.formateurId, complet: a.complet, jours: a.jours })),
    joursSession(dateDebut, dateFin), // jours ouvrés de la session
  );
  if (!conflit.length) return null;
  return `Un même jour ne peut pas être animé par deux formateurs (jour${conflit.length > 1 ? "s" : ""} en conflit : ${conflit.join(", ")}). Ajustez la répartition (« Partiellement »).`;
}

export async function createSession(
  values: SessionFormValues,
): Promise<ActionResult> {
  const { db } = await requireStaffTenant();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = sessionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  try {
    const data = toData(parsed.data);
    const refs = await validateRefs(db, data.salleId, parsed.data.formateurIds ?? []);
    const warning = await salleWarnings(
      db, refs.salleId, refs.salleCapacite, data.nbPlaces, data.dateDebut, data.dateFin,
    );
    const overlap = animationOverlap(
      parsed.data.formateursAnimation, refs.formateurIds, parsed.data.dateDebut, parsed.data.dateFin,
    );
    if (overlap) return { ok: false, error: overlap };
    const created = await db.session.create({
      data: {
        ...data,
        salleId: refs.salleId,
        createdById: session.user.id,
        formateurs: { connect: refs.formateurIds.map((fid) => ({ id: fid })) },
        formateursAnimation: buildAnimation(parsed.data.formateursAnimation, refs.formateurIds),
      },
    });
    await syncJuryAffectations(db, created.id, parsed.data.jurys ?? []);
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Session",
        entityId: created.id,
      },
    });
    revalidatePath("/sessions");
    revalidatePath("/jurys");
    return { ok: true, id: created.id, warning };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Cette référence de session est déjà utilisée." };
    }
    throw e;
  }
}

export async function updateSession(
  id: string,
  values: SessionFormValues,
): Promise<ActionResult> {
  const { db } = await requireStaffTenant();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = sessionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  try {
    const data = toData(parsed.data);
    const refs = await validateRefs(db, data.salleId, parsed.data.formateurIds ?? []);
    const warning = await salleWarnings(
      db, refs.salleId, refs.salleCapacite, data.nbPlaces, data.dateDebut, data.dateFin, id,
    );
    const overlap = animationOverlap(
      parsed.data.formateursAnimation, refs.formateurIds, parsed.data.dateDebut, parsed.data.dateFin,
    );
    if (overlap) return { ok: false, error: overlap };
    await db.session.update({
      where: { id },
      data: {
        ...data,
        salleId: refs.salleId,
        formateurs: { set: refs.formateurIds.map((fid) => ({ id: fid })) },
        formateursAnimation: buildAnimation(parsed.data.formateursAnimation, refs.formateurIds),
      },
    });
    await syncJuryAffectations(db, id, parsed.data.jurys ?? []);
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Session",
        entityId: id,
      },
    });
    revalidatePath("/sessions");
    revalidatePath(`/sessions/${id}`);
    revalidatePath("/jurys");
    return { ok: true, id, warning };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Cette référence de session est déjà utilisée." };
    }
    throw e;
  }
}

/**
 * Phase 3 — certification : marque (ou annule) la déclaration des résultats
 * d'examen au certificateur pour une session. Déclenché par un bouton.
 */
export async function setResultatsDeclares(formData: FormData) {
  const { db } = await requireStaffTenant();
  const id = String(formData.get("id"));
  const declared = String(formData.get("declared")) === "true";
  await db.session.update({
    where: { id },
    data: { resultatsDeclaresAt: declared ? new Date() : null },
  });
  revalidatePath(`/sessions/${id}`);
}
