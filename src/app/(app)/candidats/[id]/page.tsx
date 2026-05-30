import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, History, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  STATUT_LABELS,
  FINANCEMENT_LABELS,
} from "@/lib/validators/candidat";
import { INSCRIPTION_STATUT_LABELS } from "@/lib/validators/inscription";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value && value !== "" ? value : "—"}</dd>
    </div>
  );
}

export default async function CandidatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidat = await prisma.candidat.findUnique({
    where: { id },
    include: {
      inscriptions: {
        include: { session: { include: { formation: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!candidat) notFound();

  const logs = await prisma.auditLog.findMany({
    where: { entityType: "Candidat", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: true },
  });

  const fmtDate = (d: Date | null) =>
    d ? d.toLocaleDateString("fr-FR") : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/candidats"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux candidats
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {candidat.prenom} {candidat.nom}
            </h1>
            <Badge variant="secondary">{STATUT_LABELS[candidat.statut]}</Badge>
          </div>
          <Button
            variant="outline"
            render={<Link href={`/candidats/${candidat.id}/modifier`} />}
          >
            <Pencil className="mr-2 h-4 w-4" /> Modifier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Coordonnées</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Email" value={candidat.email} />
              <Field label="Téléphone" value={candidat.telephone} />
              <Field
                label="Date de naissance"
                value={fmtDate(candidat.dateNaissance)}
              />
              <Field label="Adresse" value={candidat.adresse} />
              <Field label="Code postal" value={candidat.codePostal} />
              <Field label="Ville" value={candidat.ville} />
              <Field label="Pays" value={candidat.pays} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil & financement</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <Field
                label="Situation professionnelle"
                value={candidat.situationPro}
              />
              <Field label="Employeur" value={candidat.employeur} />
              <Field label="Poste occupé" value={candidat.posteOccupe} />
              <Field
                label="Financement envisagé"
                value={
                  candidat.financementType
                    ? FINANCEMENT_LABELS[candidat.financementType]
                    : null
                }
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" /> Inscriptions (
            {candidat.inscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidat.inscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ce candidat n&apos;est inscrit à aucune session.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {candidat.inscriptions.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <Link
                    href={`/sessions/${i.sessionId}`}
                    className="font-medium hover:underline"
                  >
                    {i.session.formation.titre}
                  </Link>
                  <span className="flex items-center gap-3 text-muted-foreground">
                    <span>
                      {i.session.dateDebut.toLocaleDateString("fr-FR")}
                    </span>
                    <Badge variant="secondary">
                      {INSCRIPTION_STATUT_LABELS[i.statut]}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune action enregistrée.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <span>
                    <span className="font-medium">{log.action}</span>
                    {log.user ? (
                      <span className="text-muted-foreground">
                        {" "}
                        — {log.user.name}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">
                    {log.createdAt.toLocaleString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
