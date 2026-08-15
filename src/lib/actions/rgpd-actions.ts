"use server";

import { revalidatePath } from "next/cache";
import { DataRequestType, DataRequestStatut } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { requireSection } from "@/lib/section-guard";
import { anonymiseCandidatComplet } from "@/lib/rgpd/anonymise";

export async function createDataRequest(formData: FormData) {
  await requireSection("rgpd");
  const db = await getTenantDb();

  const subjectEmail = String(formData.get("subjectEmail") ?? "").trim();
  const type = String(formData.get("type")) as DataRequestType;
  if (!subjectEmail) return;

  await db.dataRequest.create({ data: { subjectEmail, type } });
  revalidatePath("/rgpd");
}

export async function processDataRequest(formData: FormData) {
  const session = await requireSection("rgpd");
  const db = await getTenantDb();

  const id = String(formData.get("id"));
  await db.dataRequest.update({
    where: { id },
    data: {
      statut: DataRequestStatut.TRAITEE,
      processedAt: new Date(),
      processedById: session.user.id,
    },
  });
  revalidatePath("/rgpd");
}

// Droit à la portabilité (RGPD art. 20) : export structuré, lisible et
// réutilisable des données personnelles d'une personne (par e-mail), cloisonné
// à l'organisme. Renvoie un JSON prêt à télécharger côté client.
export async function exportDonneesPersonne(
  email: string,
): Promise<{ ok: boolean; error?: string; filename?: string; json?: string }> {
  const session = await requireSection("rgpd");
  const db = await getTenantDb();

  const e = email.trim().toLowerCase();
  if (!e) return { ok: false, error: "Indiquez un e-mail." };

  const candidats = await db.candidat.findMany({
    where: { email: { equals: e, mode: "insensitive" } },
    include: {
      inscriptions: {
        include: { session: { include: { formation: { select: { titre: true } } } } },
      },
      pieces: { select: { label: true, categorie: true, statut: true, createdAt: true } },
      consentements: true,
      interactionsCandidat: { select: { type: true, date: true, sujet: true } },
    },
  });
  if (candidats.length === 0) return { ok: false, error: "Aucune donnée pour cet e-mail." };

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "EXPORT_RGPD",
      entityType: "Candidat",
      entityId: candidats[0].id,
    },
  });

  const payload = { exporteLe: new Date().toISOString(), sujet: e, candidats };
  return {
    ok: true,
    filename: `export-rgpd-${e.replace(/[^a-z0-9]/gi, "_")}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}

// Anonymisation (droit à l'effacement, art. 17) : on conserve les enregistrements
// liés (obligations Qualiopi/comptables) mais on efface TOUTES les données
// personnelles — candidat, pièces déposées, signatures manuscrites, IP, messages.
// Logique unique partagée avec la purge automatique (cf. lib/rgpd/anonymise).
export async function anonymiseCandidat(formData: FormData) {
  const session = await requireSection("rgpd");
  const organismeId = session.user.organismeId;
  if (!organismeId) return;
  const db = await getTenantDb();

  const candidatId = String(formData.get("candidatId"));
  const c = await db.candidat.findUnique({ where: { id: candidatId } });
  if (!c) return;

  await anonymiseCandidatComplet(db, organismeId, candidatId, {
    action: "ANONYMISATION_RGPD",
    userId: session.user.id,
  });

  revalidatePath("/candidats");
  revalidatePath(`/candidats/${candidatId}`);
  revalidatePath("/rgpd");
}
