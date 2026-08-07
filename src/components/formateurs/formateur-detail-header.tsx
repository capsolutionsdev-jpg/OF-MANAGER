import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormateurTabs, type FormateurTabKey } from "@/components/formateurs/formateur-tabs";

/**
 * En-tête partagé des onglets de la fiche formateur.
 * Rend le lien retour, l'identité (nom), l'action Modifier puis la barre
 * d'onglets. Chaque page d'onglet le rend UNE fois (pas de layout.tsx sous
 * [id], sinon double en-tête avec les sous-pages).
 */
export function FormateurDetailHeader({
  formateur,
  active,
  planningCount,
  facturesCount,
}: {
  formateur: {
    id: string;
    prenom: string;
    nom: string;
  };
  active: FormateurTabKey;
  planningCount: number;
  facturesCount: number;
}) {
  return (
    <div>
      <Link
        href="/formateurs"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux formateurs
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {formateur.prenom} {formateur.nom}
        </h1>
        <Button variant="outline" render={<Link href={`/formateurs/${formateur.id}/modifier`} />}>
          <Pencil className="mr-2 h-4 w-4" /> Modifier
        </Button>
      </div>

      <div className="mt-4">
        <FormateurTabs
          formateurId={formateur.id}
          active={active}
          planningCount={planningCount}
          facturesCount={facturesCount}
        />
      </div>
    </div>
  );
}
