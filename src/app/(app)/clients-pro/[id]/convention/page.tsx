import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConventionBuilder } from "@/components/clients-pro/convention-builder";

export const dynamic = "force-dynamic";

export default async function ConventionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await getTenantDb();
  const { id } = await params;
  const [client, formations, sessions] = await Promise.all([
    db.entreprise.findUnique({ where: { id } }),
    db.formation.findMany({
      where: { isArchived: false },
      orderBy: { titre: "asc" },
      select: { id: true, titre: true, reference: true, certification: true, duree: true, modalite: true },
    }),
    db.session.findMany({
      where: { statut: { not: "ANNULEE" } },
      orderBy: { dateDebut: "desc" },
      take: 100,
      include: { formation: { select: { titre: true } } },
    }),
  ]);
  if (!client) notFound();

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const sessionOpts = sessions.map((s) => ({
    id: s.id,
    formationId: s.formationId,
    dateDebut: fmt(s.dateDebut),
    dateFin: fmt(s.dateFin),
    lieu: s.lieu,
    horaires: s.horaires,
    label: `${s.formation.titre} — ${fmt(s.dateDebut)} → ${fmt(s.dateFin)}${s.lieu ? ` (${s.lieu})` : ""}`,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/clients-pro/${client.id}`}
          className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> {client.raisonSociale}
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FileText className="h-6 w-6 text-primary" /> Bon de convention
        </h1>
        <p className="text-sm text-muted-foreground">
          Saisissez les candidats, la formation, la session et le tarif : la convention
          de formation est générée en PDF (une par candidat), avec les coordonnées de{" "}
          {client.raisonSociale}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations de la convention</CardTitle>
          <CardDescription>
            Astuce : choisissez une session existante pour pré-remplir les dates et le lieu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConventionBuilder
            entrepriseId={client.id}
            formations={formations}
            sessions={sessionOpts}
          />
        </CardContent>
      </Card>
    </div>
  );
}
