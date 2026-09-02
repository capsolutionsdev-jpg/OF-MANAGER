"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { PieceEtat } from "@/lib/audit/pieces-organisme";

type Result = { ok: true } | { ok: false; error: string };

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

/**
 * Met à jour l'état d'UNE pièce Qualiopi de l'organisme (rubrique « Documents de
 * l'organisme »). Écrit dans Organisme.piecesQualiopi (Json), clé = `cle`.
 */
export async function majPieceOrganisme(cle: string, patch: Partial<PieceEtat>): Promise<Result> {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId) return { ok: false, error: "Non autorisé." };
  if (!cle || cle.length > 40) return { ok: false, error: "Pièce invalide." };

  try {
    const org = await prisma.organisme.findUnique({ where: { id: organismeId }, select: { piecesQualiopi: true } });
    if (!org) return { ok: false, error: "Organisme introuvable." };
    const all = (org.piecesQualiopi && typeof org.piecesQualiopi === "object" ? { ...(org.piecesQualiopi as Record<string, PieceEtat>) } : {}) as Record<string, PieceEtat>;
    const prev = all[cle] ?? { statut: "A_OBTENIR" };
    all[cle] = {
      ...prev,
      ...patch,
      updatedBy: session.user.name || session.user.email || "Collaborateur",
      updatedAt: new Date().toISOString(),
    };
    await prisma.organisme.update({ where: { id: organismeId }, data: { piecesQualiopi: all } });
    revalidatePath("/audit/organisme");
    return { ok: true };
  } catch (e) {
    console.error("majPieceOrganisme:", e);
    return { ok: false, error: "Enregistrement impossible." };
  }
}
