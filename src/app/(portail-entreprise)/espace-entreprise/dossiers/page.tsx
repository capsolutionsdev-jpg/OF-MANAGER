import { FolderOpen } from "lucide-react";
import { requireEntreprise } from "@/lib/entreprise-portal";
import { getEntrepriseDossiers } from "@/lib/dossier/etat-data";
import { RubriqueHeader, EmptyState } from "@/components/entreprise/portal-ui";
import { DossierPanel } from "@/components/dossier/dossier-panel";

export const dynamic = "force-dynamic";

export default async function DossiersPage() {
  const entreprise = await requireEntreprise();
  const dossiers = await getEntrepriseDossiers(entreprise.id);

  return (
    <div className="space-y-6">
      <RubriqueHeader
        title="Dossiers des candidats"
        subtitle="Après signature de la convention, déposez ici les pièces administratives de chaque salarié inscrit. Le centre de formation les vérifie et les valide."
      />
      {dossiers.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-8 w-8" />}
          title="Aucun dossier à compléter pour le moment"
          hint="Les dossiers de vos salariés apparaissent ici dès que la convention correspondante est signée."
        />
      ) : (
        <div className="space-y-4">
          {dossiers.map((d) => (
            <DossierPanel
              key={d.inscriptionId}
              inscriptionId={d.inscriptionId}
              candidat={d.candidat}
              formation={d.formation}
              etats={d.etats}
              progress={d.progress}
              mode="client"
            />
          ))}
        </div>
      )}
    </div>
  );
}
