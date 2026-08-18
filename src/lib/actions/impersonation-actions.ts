"use server";

import { redirect } from "next/navigation";
import { auth, update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import type { ImpUpdatePayload } from "@/lib/impersonation";

export type ImpersonationResult = { error: string };

// `update` (unstable_update de NextAuth) transmet sa charge au callback jwt
// (trigger "update"). On la type localement pour notre payload d'impersonation.
const updateSession = update as unknown as (data: ImpUpdatePayload) => Promise<unknown>;

/**
 * Démarre le « mode support » : le SUPERADMIN se connecte en tant qu'ADMIN de
 * l'organisme cible. Tracé en journal d'audit. Redirige vers l'espace du client.
 * SUPERADMIN uniquement ; refuse l'imbrication.
 */
export async function startImpersonation(organismeId: string): Promise<ImpersonationResult | void> {
  const session = await requireSuperAdmin();
  if (session.user.imp) return { error: "Déjà en mode support." };

  const org = await prisma.organisme.findUnique({
    where: { id: organismeId },
    select: { id: true, nom: true, fonctionnalites: true },
  });
  if (!org) return { error: "Organisme introuvable." };

  await prisma.auditLog.create({
    data: {
      organismeId: org.id,
      userId: session.user.id,
      action: "IMPERSONATION_START",
      entityType: "Organisme",
      entityId: org.id,
      changesJson: { superAdmin: session.user.email ?? session.user.id, orgNom: org.nom },
    },
  });

  await updateSession({ imp: { orgId: org.id, orgNom: org.nom, fonctionnalites: org.fonctionnalites ?? [] } });
  redirect("/dashboard");
}

/**
 * Quitte le mode support : restaure l'identité SUPERADMIN. Tracé en audit.
 * Accessible uniquement si une impersonation est en cours (claim `imp`).
 */
export async function stopImpersonation(): Promise<void> {
  const session = await auth();
  const imp = session?.user?.imp;
  if (!imp || !session?.user?.id) redirect("/login");

  await prisma.auditLog.create({
    data: {
      organismeId: imp.orgId,
      userId: session.user.id,
      action: "IMPERSONATION_STOP",
      entityType: "Organisme",
      entityId: imp.orgId,
    },
  });

  await updateSession({ imp: null });
  redirect("/console");
}
