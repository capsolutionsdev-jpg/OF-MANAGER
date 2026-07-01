import { ClipboardCheck } from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSection } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ValidationsManager, type ValidationRow } from "@/components/validations/validations-manager";

export const dynamic = "force-dynamic";

export default async function ValidationsPage() {
  await requireSection("validations");
  const db = await getTenantDb();

  const [rows, session] = await Promise.all([
    db.validationDemande.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    auth(),
  ]);
  const u = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, permissions: true } })
    : null;
  const canValidate = u ? canAccessSection(u.role, u.permissions, "validations") : false;

  const items: ValidationRow[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    titre: r.titre,
    description: r.description,
    lienHref: r.lienHref,
    statut: r.statut,
    createdByNom: r.createdByNom,
    valideParNom: r.valideParNom,
    motifRefus: r.motifRefus,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
  }));
  const nbAttente = items.filter((i) => i.statut === "EN_ATTENTE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validations"
        subtitle="File des actions à valider (dossiers, inscriptions, tâches, paiements…). Chaque validation est tracée avec le nom du collaborateur."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-2xl font-bold">{nbAttente}</p>
            <p className="text-xs text-muted-foreground">En attente de validation</p>
          </CardContent>
        </Card>
      </div>
      <ValidationsManager items={items} canValidate={canValidate} />
    </div>
  );
}
