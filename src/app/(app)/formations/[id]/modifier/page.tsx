import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { FormationForm } from "@/components/formations/formation-form";

export default async function ModifierFormationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await getTenantDb();
  const { id } = await params;
  const f = await db.formation.findUnique({ where: { id } });
  if (!f) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/formations/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la fiche
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Modifier — {f.titre}</h1>
      </div>

      <div className="max-w-3xl">
        <FormationForm
          formationId={f.id}
          defaultValues={{
            titre: f.titre,
            reference: f.reference,
            certification: f.certification ?? "",
            duree: f.duree ?? "",
            dureeHeures: f.dureeHeures != null ? String(f.dureeHeures) : "",
            tarif: f.tarif != null ? String(f.tarif) : "",
            modalite: f.modalite,
            academy: f.academy ?? "",
            objectifs: f.objectifs ?? "",
            programme: f.programme ?? "",
            prerequis: f.prerequis ?? "",
            publicVise: f.publicVise ?? "",
            methodesPedagogiques: f.methodesPedagogiques ?? "",
            modalitesEvaluation: f.modalitesEvaluation ?? "",
            conditionsAcces: f.conditionsAcces ?? "",
            delaiAcces: f.delaiAcces ?? "",
            piecesAttendues: f.piecesAttendues.join("\n"),
            examen: f.examen,
          }}
        />
      </div>
    </div>
  );
}
