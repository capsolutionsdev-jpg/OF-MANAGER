import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Copy, Archive } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MODALITE_LABELS } from "@/lib/validators/formation";
import {
  archiveFormationAction,
  duplicateFormationAction,
} from "@/lib/actions/formation-actions";

function Block({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <p className="mt-1 whitespace-pre-line text-sm">{value}</p>
    </div>
  );
}

export default async function FormationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await getTenantDb();
  const { id } = await params;
  const f = await db.formation.findUnique({
    where: { id },
    include: { sessions: { orderBy: { dateDebut: "desc" } } },
  });
  if (!f) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/formations"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au catalogue
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{f.titre}</h1>
            <Badge variant="secondary">{MODALITE_LABELS[f.modalite]}</Badge>
            {f.isArchived && <Badge variant="outline">Archivée</Badge>}
            {f.version > 1 && <Badge variant="outline">v{f.version}</Badge>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              render={<Link href={`/formations/${f.id}/positionnement`} />}
            >
              Test de positionnement
            </Button>
            <Button
              variant="outline"
              render={<Link href={`/formations/${f.id}/modifier`} />}
            >
              <Pencil className="mr-2 h-4 w-4" /> Modifier
            </Button>
            <form action={duplicateFormationAction}>
              <input type="hidden" name="id" value={f.id} />
              <Button type="submit" variant="outline">
                <Copy className="mr-2 h-4 w-4" /> Dupliquer
              </Button>
            </form>
            {!f.isArchived && (
              <form action={archiveFormationAction}>
                <input type="hidden" name="id" value={f.id} />
                <Button type="submit" variant="outline">
                  <Archive className="mr-2 h-4 w-4" /> Archiver
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Contenu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Block label="Objectifs" value={f.objectifs} />
            <Block label="Programme" value={f.programme} />
            <Block label="Prérequis" value={f.prerequis} />
            <Block label="Public visé" value={f.publicVise} />
            <Block label="Méthodes pédagogiques" value={f.methodesPedagogiques} />
            <Block label="Modalités d'évaluation" value={f.modalitesEvaluation} />
            <Block label="Conditions d'accès" value={f.conditionsAcces} />
            <Block label="Délai d'accès" value={f.delaiAcces} />
            {f.piecesAttendues.length > 0 && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Dossier administratif — pièces attendues
                </h3>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
                  {f.piecesAttendues.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {!f.objectifs &&
              !f.programme &&
              !f.prerequis &&
              !f.publicVise && (
                <p className="text-sm text-muted-foreground">
                  Aucun contenu pédagogique renseigné.
                </p>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Block label="Référence" value={f.reference} />
            <Block label="Certification" value={f.certification} />
            <Block label="Durée" value={f.duree} />
            <Block
              label="Tarif"
              value={f.tarif ? `${Number(f.tarif)} € HT` : null}
            />
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sessions
              </h3>
              <p className="mt-1 text-sm">
                {f.sessions.length} session
                {f.sessions.length > 1 ? "s" : ""} programmée
                {f.sessions.length > 1 ? "s" : ""}.{" "}
                <Link href="/sessions" className="text-primary hover:underline">
                  Voir
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
