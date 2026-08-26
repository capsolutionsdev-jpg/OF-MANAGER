"use server";

import { revalidatePath } from "next/cache";
import { ValidationType } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSection } from "@/lib/permissions";

type Ctx = { id: string; name: string; role: string; organismeId: string; permissions: string[] };
type Result = { ok: true } | { ok: false; error: string };

async function ctx(): Promise<Ctx> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!session?.user || !userId) throw new Error("Non autorisé.");
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, organismeId: true, permissions: true, isActive: true },
  });
  if (!u || !u.isActive || !u.organismeId) throw new Error("Non autorisé.");
  return { id: u.id, name: u.name, role: u.role, organismeId: u.organismeId, permissions: u.permissions };
}

/** Peut valider = section "validations" accordée (ou rôle qui l'autorise). */
function peutValider(c: Ctx): boolean {
  return canAccessSection(c.role as never, c.permissions, "validations");
}

export type CreateValidationInput = {
  type: ValidationType;
  titre: string;
  description?: string;
  lienHref?: string;
  candidatId?: string;
};

/** Soumet une demande de validation (le « maker »). Tout membre du staff peut soumettre. */
export async function createValidation(input: CreateValidationInput): Promise<Result> {
  const c = await ctx();
  const titre = (input.titre ?? "").trim();
  if (!Object.values(ValidationType).includes(input.type)) return { ok: false, error: "Type invalide." };
  if (!titre) return { ok: false, error: "Intitulé requis." };
  // Cloisonnement (audit A05-018) : accès raw prisma → on vérifie explicitement
  // que le candidat éventuellement lié appartient bien à l'organisme courant.
  const candidatId = (input.candidatId ?? "").trim() || null;
  if (candidatId) {
    const candOk = await prisma.candidat.findFirst({
      where: { id: candidatId, organismeId: c.organismeId },
      select: { id: true },
    });
    if (!candOk) return { ok: false, error: "Candidat introuvable." };
  }
  await prisma.validationDemande.create({
    data: {
      organismeId: c.organismeId,
      type: input.type,
      titre,
      description: (input.description ?? "").trim() || null,
      lienHref: (input.lienHref ?? "").trim() || null,
      candidatId,
      createdById: c.id,
      createdByNom: c.name,
    },
  });
  revalidatePath("/validations");
  return { ok: true };
}

/** Valide ou refuse une demande (le « checker »). Réservé au droit délégué. */
export async function decideValidation(
  id: string,
  decision: "VALIDE" | "REFUSE",
  motif?: string,
): Promise<Result> {
  const c = await ctx();
  if (!peutValider(c)) return { ok: false, error: "Vous n'avez pas le droit de valider." };
  if (decision !== "VALIDE" && decision !== "REFUSE") return { ok: false, error: "Décision invalide." };

  const res = await prisma.validationDemande.updateMany({
    where: { id, organismeId: c.organismeId, statut: "EN_ATTENTE" },
    data: {
      statut: decision,
      valideParId: c.id,
      valideParNom: c.name,
      motifRefus: decision === "REFUSE" ? (motif ?? "").trim() || null : null,
      decidedAt: new Date(),
    },
  });
  if (res.count === 0) return { ok: false, error: "Demande introuvable ou déjà traitée." };
  revalidatePath("/validations");
  return { ok: true };
}

/** Supprime une demande (admin — ex. doublon). */
export async function deleteValidation(id: string): Promise<Result> {
  const c = await ctx();
  if (!peutValider(c)) return { ok: false, error: "Non autorisé." };
  const res = await prisma.validationDemande.deleteMany({ where: { id, organismeId: c.organismeId } });
  if (res.count === 0) return { ok: false, error: "Demande introuvable." };
  revalidatePath("/validations");
  return { ok: true };
}
