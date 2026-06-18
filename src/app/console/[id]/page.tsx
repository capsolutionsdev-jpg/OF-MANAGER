import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditOrganismeForm } from "@/components/console/edit-organisme-form";
import { getResolvedPlans } from "@/lib/pricing";
import { PLAN_ORDER } from "@/lib/plans";
import { roleLabels } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function ConsoleOrganismePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await prisma.organisme.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, isActive: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!org) notFound();

  const { plans } = await getResolvedPlans();
  const ordered = PLAN_ORDER.map((k) => plans[k]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/console/organismes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux organismes
      </Link>
      <PageHeader title={org.nom} subtitle="Configuration de l'instance">
        {org.version && <Badge variant="secondary">{org.version}</Badge>}
        <Badge>{org.statut}</Badge>
        {org.appUrl && (
          <a
            href={org.appUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Ouvrir l&apos;app
          </a>
        )}
      </PageHeader>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm text-muted-foreground">
            Comptes ({org.users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {org.users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{u.name}</span>
              <span className="text-muted-foreground">{u.email}</span>
              <Badge variant="secondary">{roleLabels[u.role]}</Badge>
              {!u.isActive && <Badge className="bg-rose-500/10 text-rose-700">inactif</Badge>}
            </div>
          ))}
          {org.users.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun compte rattaché.</p>
          )}
        </CardContent>
      </Card>

      <EditOrganismeForm org={org} plans={ordered} />
    </div>
  );
}
