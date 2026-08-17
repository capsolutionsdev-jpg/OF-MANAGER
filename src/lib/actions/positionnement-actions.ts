"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import type { PositionnementQuestion } from "@/lib/positionnement";

async function requireUser() {
  // Correctif audit P2-1 (BFLA) : réservé au personnel — rejette APPRENANT/FORMATEUR.
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (!session?.user || role === "APPRENANT" || role === "FORMATEUR") {
    throw new Error("Non autorisé.");
  }
  return session.user;
}

/** Enregistre les questions personnalisées du test de positionnement d'une formation. */
export async function savePositionnementQuestions(
  formationId: string,
  questions: PositionnementQuestion[],
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const db = await getTenantDb();
  const propres = questions
    .map((q, idx) => ({
      id: q.id?.trim() || `q${idx + 1}`,
      type: q.type,
      question: q.question?.trim() ?? "",
      options:
        q.type === "COURTE"
          ? undefined
          : (q.options ?? []).map((o) => o.trim()).filter(Boolean),
    }))
    .filter(
      (q) =>
        q.question.length > 0 &&
        (q.type === "COURTE" || (q.options && q.options.length >= 2)),
    );

  if (propres.length === 0)
    return { ok: false, error: "Au moins une question valide est requise (les QCU/QCM doivent avoir ≥ 2 options)." };

  await db.formation.update({
    where: { id: formationId },
    data: { positionnementQuestions: propres as unknown as Prisma.InputJsonValue },
  });
  revalidatePath(`/formations/${formationId}`);
  return { ok: true };
}

/** Réinitialise la formation sur la banque de questions automatique. */
export async function resetPositionnementQuestions(
  formationId: string,
): Promise<{ ok: boolean }> {
  await requireUser();
  const db = await getTenantDb();
  await db.formation.update({
    where: { id: formationId },
    data: { positionnementQuestions: Prisma.DbNull },
  });
  revalidatePath(`/formations/${formationId}`);
  return { ok: true };
}
