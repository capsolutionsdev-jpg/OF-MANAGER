import Link from "next/link";
import { ArrowLeft, Pencil, Copy, Archive } from "lucide-react";
import type { Modalite } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { MODALITE_LABELS } from "@/lib/validators/formation";
import {
  archiveFormationAction,
  duplicateFormationAction,
} from "@/lib/actions/formation-actions";
import { FormationTabs, type FormationTabKey } from "@/components/formations/formation-tabs";

/**
 * En-tête partagé des onglets de la fiche formation.
 * Rend le lien retour, le titre + badges (modalité, archivée, version), les
 * actions transverses (Test de positionnement, Modifier, Dupliquer, Archiver)
 * puis la barre d'onglets. Chaque page d'onglet le rend UNE fois (pas de
 * layout.tsx sous [id], sinon double en-tête avec les sous-pages).
 */
export function FormationDetailHeader({
  formation,
  active,
  diplomesCount,
  sessionsCount,
}: {
  formation: {
    id: string;
    titre: string;
    modalite: Modalite;
    isArchived: boolean;
    version: number;
  };
  active: FormationTabKey;
  diplomesCount: number;
  sessionsCount: number;
}) {
  return (
    <div>
      <Link
        href="/formations"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au catalogue
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{formation.titre}</h1>
          <Badge variant="secondary">{MODALITE_LABELS[formation.modalite]}</Badge>
          {formation.isArchived && <Badge variant="outline">Archivée</Badge>}
          {formation.version > 1 && <Badge variant="outline">v{formation.version}</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            render={<Link href={`/formations/${formation.id}/positionnement`} />}
          >
            Test de positionnement
          </Button>
          <Button
            variant="outline"
            render={<Link href={`/formations/${formation.id}/modifier`} />}
          >
            <Pencil className="mr-2 h-4 w-4" /> Modifier
          </Button>
          <form action={duplicateFormationAction}>
            <input type="hidden" name="id" value={formation.id} />
            <Button type="submit" variant="outline">
              <Copy className="mr-2 h-4 w-4" /> Dupliquer
            </Button>
          </form>
          {!formation.isArchived && (
            <form action={archiveFormationAction}>
              <input type="hidden" name="id" value={formation.id} />
              <ConfirmSubmitButton
                variant="outline"
                confirm={{
                  title: `Archiver « ${formation.titre} » ?`,
                  description:
                    "La formation sera retirée du catalogue actif. Ses sessions passées restent consultables ; vous pourrez la réactiver plus tard.",
                  confirmLabel: "Archiver",
                }}
              >
                <Archive className="mr-2 h-4 w-4" /> Archiver
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      </div>

      <div className="mt-4">
        <FormationTabs
          formationId={formation.id}
          active={active}
          diplomesCount={diplomesCount}
          sessionsCount={sessionsCount}
        />
      </div>
    </div>
  );
}
