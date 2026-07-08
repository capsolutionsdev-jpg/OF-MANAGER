"use server";

import { revalidatePath } from "next/cache";
import { DiplomeStatut } from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { hasStrictFeature } from "@/lib/feature-guard";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
type Result = { ok: true; id?: string } | { ok: false; error: string };

async function guard() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (!session?.user || !role || !STAFF.includes(role)) throw new Error("Non autorisé.");
  if (!(await hasStrictFeature("diplomes"))) throw new Error("Module diplômes non activé.");
  return { nom: session.user.name || session.user.email || "Collaborateur" };
}

/**
 * Enregistre un diplôme en RÉCUPÉRANT les coordonnées d'un inscrit (nom, prénom,
 * date & lieu de naissance) + session/formation. Le n° de diplôme est saisi.
 */
export async function createDiplomeFromInscription(
  inscriptionId: string,
  numeroDiplome?: string,
): Promise<Result> {
  await guard();
  const db = await getTenantDb();
  const insc = await db.inscription.findFirst({
    where: { id: inscriptionId },
    include: { candidat: true, session: { select: { id: true, formationId: true } } },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };
  const c = insc.candidat;
  const d = await db.diplome.create({
    data: {
      inscriptionId: insc.id,
      sessionId: insc.session.id,
      formationId: insc.session.formationId,
      nom: c.nom,
      prenom: c.prenom,
      dateNaissance: c.dateNaissance,
      lieuNaissance: c.lieuNaissance ?? null,
      numeroDiplome: numeroDiplome?.trim() || null,
      statut: "ENVOYE_CERTIFICATEUR",
      envoyeCertificateurAt: new Date(),
    },
  });
  revalidatePath("/diplomes");
  return { ok: true, id: d.id };
}

/** Enregistre un diplôme manuellement (coordonnées saisies). */
export async function createDiplomeManuel(input: {
  nom: string;
  prenom: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  numeroDiplome?: string;
  sessionId?: string;
  formationId?: string;
}): Promise<Result> {
  await guard();
  if (!input.nom.trim() || !input.prenom.trim())
    return { ok: false, error: "Nom et prénom requis." };
  if (!input.formationId?.trim())
    return { ok: false, error: "Précisez la formation du diplôme." };
  const db = await getTenantDb();
  const d = await db.diplome.create({
    data: {
      nom: input.nom.trim(),
      prenom: input.prenom.trim(),
      dateNaissance: input.dateNaissance ? new Date(input.dateNaissance) : null,
      lieuNaissance: input.lieuNaissance?.trim() || null,
      numeroDiplome: input.numeroDiplome?.trim() || null,
      sessionId: input.sessionId || null,
      formationId: input.formationId.trim(),
      statut: "ENVOYE_CERTIFICATEUR",
      envoyeCertificateurAt: new Date(),
    },
  });
  revalidatePath("/diplomes");
  return { ok: true, id: d.id };
}

/** Met à jour le n° de diplôme. */
export async function setDiplomeNumero(id: string, numeroDiplome: string): Promise<Result> {
  await guard();
  const db = await getTenantDb();
  const r = await db.diplome.updateMany({
    where: { id },
    data: { numeroDiplome: numeroDiplome.trim() || null },
  });
  if (r.count === 0) return { ok: false, error: "Diplôme introuvable." };
  revalidatePath("/diplomes");
  return { ok: true };
}

/**
 * Change le statut du diplôme (envoyé certificateur → reçu → remis) en
 * horodatant l'étape. À « remis », trace le collaborateur (remiseParNom).
 */
export async function setDiplomeStatut(id: string, statut: DiplomeStatut): Promise<Result> {
  const { nom } = await guard();
  const db = await getTenantDb();
  const data: Record<string, unknown> = { statut };
  if (statut === "ENVOYE_CERTIFICATEUR") data.envoyeCertificateurAt = new Date();
  if (statut === "RECU") data.recuAt = new Date();
  if (statut === "REMIS") {
    data.remisAt = new Date();
    data.remiseParNom = nom;
  }
  const r = await db.diplome.updateMany({ where: { id }, data });
  if (r.count === 0) return { ok: false, error: "Diplôme introuvable." };
  revalidatePath("/diplomes");
  return { ok: true };
}

/** Supprime un diplôme. */
export async function deleteDiplome(id: string): Promise<Result> {
  await guard();
  const db = await getTenantDb();
  const r = await db.diplome.deleteMany({ where: { id } });
  if (r.count === 0) return { ok: false, error: "Diplôme introuvable." };
  revalidatePath("/diplomes");
  return { ok: true };
}
