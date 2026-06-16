"use server";

import { revalidatePath } from "next/cache";
import {
  ReclamationOrigine,
  ReclamationStatut,
  VeilleType,
} from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Non autorisé.");
  return session.user;
}

// ───── Réclamations (indicateurs 31-32) ─────

export async function creerReclamation(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  const origineRaw = String(formData.get("origine") ?? "STAGIAIRE");
  const origine = (Object.values(ReclamationOrigine) as string[]).includes(origineRaw)
    ? (origineRaw as ReclamationOrigine)
    : ReclamationOrigine.AUTRE;

  await db.reclamation.create({
    data: {
      origine,
      declarant: String(formData.get("declarant") ?? "").trim() || "—",
      contact: String(formData.get("contact") ?? "").trim() || null,
      formation: String(formData.get("formation") ?? "").trim() || null,
      objet: String(formData.get("objet") ?? "").trim() || "—",
      description: String(formData.get("description") ?? "").trim() || "—",
      gravite: Math.min(3, Math.max(1, Number(formData.get("gravite") ?? 1))),
    },
  });
  revalidatePath("/qualiopi/reclamations");
}

/** Fait avancer la réclamation d'une étape (AR → traitement → clôture). */
export async function avancerReclamation(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const cible = String(formData.get("statut") ?? "") as ReclamationStatut;
  if (!id || !(Object.values(ReclamationStatut) as string[]).includes(cible)) return;

  const now = new Date();
  await db.reclamation.update({
    where: { id },
    data: {
      statut: cible,
      ...(cible === "ACCUSE_RECEPTION" ? { arDate: now } : {}),
      ...(cible === "EN_TRAITEMENT" ? {} : {}),
      ...(cible === "CLOTUREE" ? { clotureDate: now, reponseDate: now } : {}),
    },
  });
  revalidatePath("/qualiopi/reclamations");
}

export async function completerReclamation(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.reclamation.update({
    where: { id },
    data: {
      analyse: String(formData.get("analyse") ?? "").trim() || null,
      actions: String(formData.get("actions") ?? "").trim() || null,
    },
  });
  revalidatePath("/qualiopi/reclamations");
}

export async function supprimerReclamation(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) await db.reclamation.delete({ where: { id } });
  revalidatePath("/qualiopi/reclamations");
}

// ───── Veille (indicateurs 23-24-25) ─────

export async function creerVeille(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  const typeRaw = String(formData.get("type") ?? "LEGALE");
  const type = (Object.values(VeilleType) as string[]).includes(typeRaw)
    ? (typeRaw as VeilleType)
    : VeilleType.LEGALE;

  await db.veilleEntree.create({
    data: {
      type,
      source: String(formData.get("source") ?? "").trim() || "—",
      sujet: String(formData.get("sujet") ?? "").trim() || "—",
      resume: String(formData.get("resume") ?? "").trim() || null,
      action: String(formData.get("action") ?? "").trim() || null,
      lien: String(formData.get("lien") ?? "").trim() || null,
    },
  });
  revalidatePath("/qualiopi/veille");
}

export async function supprimerVeille(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) await db.veilleEntree.delete({ where: { id } });
  revalidatePath("/qualiopi/veille");
}

// ───── Partenaires (indicateurs 26-27) ─────

export async function creerPartenaire(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  await db.partenaire.create({
    data: {
      nom: String(formData.get("nom") ?? "").trim() || "—",
      categorie: String(formData.get("categorie") ?? "").trim() || "Autre",
      contact: String(formData.get("contact") ?? "").trim() || null,
      telephone: String(formData.get("telephone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      objet: String(formData.get("objet") ?? "").trim() || null,
    },
  });
  revalidatePath("/qualiopi/partenaires");
}

export async function supprimerPartenaire(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) await db.partenaire.delete({ where: { id } });
  revalidatePath("/qualiopi/partenaires");
}
