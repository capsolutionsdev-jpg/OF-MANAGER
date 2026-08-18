import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Journal d'audit GLOBAL (console éditeur, SUPERADMIN) : lecture cross-tenant de
// tous les événements tracés (AuditLog), tous organismes confondus. Hors-tenant
// par nature — réservé à la console, protégée par le middleware + requireSuperAdmin.

export type AuditRow = {
  id: string;
  createdAt: Date;
  action: string;
  entityType: string;
  entityId: string | null;
  orgNom: string | null;
  userLabel: string | null;
};

/**
 * Derniers événements d'audit (tous organismes), filtrables par action et par
 * recherche libre (organisme / action / entité / acteur). `q` est appliqué en
 * mémoire sur le lot ramené (AuditLog n'a pas de relation `organisme`, le nom est
 * résolu en un second lot).
 */
export async function getGlobalAuditLog(opts: {
  action?: string;
  q?: string;
  take?: number;
}): Promise<AuditRow[]> {
  const take = opts.take ?? 200;
  const where: Prisma.AuditLogWhereInput =
    opts.action && opts.action !== "all" ? { action: opts.action } : {};

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      createdAt: true,
      action: true,
      entityType: true,
      entityId: true,
      organismeId: true,
      user: { select: { name: true, email: true } },
    },
  });

  // Résout les noms d'organismes en un seul lot (pas de relation sur AuditLog).
  const orgIds = [...new Set(rows.map((r) => r.organismeId).filter(Boolean))] as string[];
  const orgs = orgIds.length
    ? await prisma.organisme.findMany({ where: { id: { in: orgIds } }, select: { id: true, nom: true } })
    : [];
  const nomById = new Map(orgs.map((o) => [o.id, o.nom]));

  let out: AuditRow[] = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    orgNom: r.organismeId ? nomById.get(r.organismeId) ?? null : null,
    userLabel: r.user?.name ?? r.user?.email ?? null,
  }));

  if (opts.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    out = out.filter((r) =>
      [r.action, r.entityType, r.orgNom, r.userLabel].some((v) => v?.toLowerCase().includes(q)),
    );
  }
  return out;
}

/** Types d'action présents (pour le filtre), les plus fréquents d'abord. */
export async function getAuditActions(): Promise<string[]> {
  const groups = await prisma.auditLog.groupBy({
    by: ["action"],
    _count: { action: true },
    orderBy: { _count: { action: "desc" } },
    take: 40,
  });
  return groups.map((g) => g.action);
}
