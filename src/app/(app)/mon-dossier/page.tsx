import { redirect } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { getCurrentApprenant } from "@/lib/candidat-portal";
import { getCandidatCompteDossiers } from "@/lib/dossier/etat-data";
import { PageHeader } from "@/components/ui/page-header";
import { DossierPanel } from "@/components/dossier/dossier-panel";

export const dynamic = "force-dynamic";

export default async function MonDossierPage() {
  const appr = await getCurrentApprenant();
  if (!appr?.candidatId) redirect("/login");
  const dossiers = await getCandidatCompteDossiers(appr.candidatId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon dossier"
        subtitle="Déposez les pièces administratives demandées pour vos formations. Le centre de formation les vérifie et les valide."
      />
      {dossiers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <FolderOpen className="h-8 w-8" />
          Aucune pièce à fournir pour le moment.
        </div>
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
              mode="candidat"
            />
          ))}
        </div>
      )}
    </div>
  );
}
