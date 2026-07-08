"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

type Result = { ok: true } | { ok: false; error: string };

async function candidat(): Promise<{ candidatId: string; userId: string } | null> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "APPRENANT") return null;
  const db = await getTenantDb();
  const a = await db.apprenant.findUnique({
    where: { userId: session.user.id },
    select: { candidatId: true },
  });
  return a ? { candidatId: a.candidatId, userId: session.user.id } : null;
}

/**
 * « Je suis intéressé » / demande d'inscription depuis le portail candidat.
 * Matérialise la demande côté OF via une interaction (visible sur la fiche
 * candidat) — un prospect/demande à traiter, sans quitter le tenant.
 */
export async function demanderInscription(formationId: string, message?: string): Promise<Result> {
  const c = await candidat();
  if (!c) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  const f = await db.formation.findUnique({ where: { id: formationId }, select: { titre: true } });
  if (!f) return { ok: false, error: "Formation introuvable." };

  await db.candidatInteraction.create({
    data: {
      candidatId: c.candidatId,
      type: "NOTE",
      sujet: "Demande d'inscription (portail candidat)",
      contenu:
        `Le candidat s'est déclaré intéressé par la formation « ${f.titre} ».` +
        (message && message.trim() ? `\n\nMessage : ${message.trim()}` : ""),
      userId: c.userId,
    },
  });
  revalidatePath("/catalogue");
  return { ok: true };
}

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);

/** Le candidat met à jour ses coordonnées depuis son profil (portail). */
export async function updateCandidatProfil(input: {
  telephone?: string; adresse?: string; codePostal?: string; ville?: string;
}): Promise<Result> {
  const c = await candidat();
  if (!c) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  await db.candidat.update({
    where: { id: c.candidatId },
    data: {
      telephone: clean(input.telephone),
      adresse: clean(input.adresse),
      codePostal: clean(input.codePostal),
      ville: clean(input.ville),
    },
  });
  revalidatePath("/mon-profil");
  return { ok: true };
}

/** Le candidat envoie un message à l'organisme (messagerie du portail). */
export async function envoyerMessageCandidat(corps: string): Promise<Result> {
  const c = await candidat();
  if (!c) return { ok: false, error: "Non autorisé." };
  if (!corps.trim()) return { ok: false, error: "Message vide." };
  const db = await getTenantDb();
  await db.candidatMessage.create({
    data: {
      candidatId: c.candidatId,
      corps: corps.trim().slice(0, 5000),
      deCandidat: true,
      luParOf: false,
    },
  });
  revalidatePath("/messagerie");
  return { ok: true };
}

/** Marque comme lus les messages de l'OF (à l'ouverture de la messagerie). */
export async function marquerMessagesLusCandidat(): Promise<Result> {
  const c = await candidat();
  if (!c) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();
  await db.candidatMessage.updateMany({
    where: { candidatId: c.candidatId, deCandidat: false, luParCandidat: false },
    data: { luParCandidat: true },
  });
  return { ok: true };
}

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

/** Réponse de l'ORGANISME (staff) à un candidat depuis sa fiche. */
export async function repondreMessageCandidat(candidatId: string, corps: string): Promise<Result> {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (!session?.user || !role || !STAFF.includes(role)) return { ok: false, error: "Non autorisé." };
  if (!corps.trim()) return { ok: false, error: "Message vide." };
  const db = await getTenantDb();
  // findFirst scopé tenant → refuse un candidat d'un autre organisme.
  const cand = await db.candidat.findFirst({ where: { id: candidatId }, select: { id: true } });
  if (!cand) return { ok: false, error: "Candidat introuvable." };
  await db.candidatMessage.create({
    data: {
      candidatId,
      corps: corps.trim().slice(0, 5000),
      deCandidat: false,
      auteurNom: session.user.name || "Organisme",
      luParCandidat: false,
      luParOf: true,
    },
  });
  // Les messages du candidat sont désormais traités (lus par l'OF).
  await db.candidatMessage.updateMany({
    where: { candidatId, deCandidat: true, luParOf: false },
    data: { luParOf: true },
  });
  revalidatePath(`/candidats/${candidatId}`);
  return { ok: true };
}
