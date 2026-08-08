import { notFound } from "next/navigation";
import Link from "next/link";
import { getFormationDetail } from "@/lib/formations/detail";
import { FormationDetailHeader } from "@/components/formations/formation-detail-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  const { id } = await params;
  const detail = await getFormationDetail(id);
  if (!detail) notFound();

  const { f, diplomes } = detail;

  return (
    <div className="space-y-6">
      <FormationDetailHeader
        formation={{
          id: f.id,
          titre: f.titre,
          modalite: f.modalite,
          isArchived: f.isArchived,
          version: f.version,
        }}
        active="fiche"
        diplomesCount={diplomes.length}
        sessionsCount={f.sessions.length}
      />

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
                <Link
                  href={`/formations/${f.id}/sessions`}
                  className="text-primary hover:underline"
                >
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
