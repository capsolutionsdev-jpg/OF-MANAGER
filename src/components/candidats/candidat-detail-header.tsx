import Link from "next/link";
import { ArrowLeft, Pencil, ClipboardCheck } from "lucide-react";
import type { CandidatStatut } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUT_LABELS } from "@/lib/validators/candidat";
import { CandidatTabs, type CandidatTabKey } from "@/components/candidats/candidat-tabs";
import { CandidatActionsMenu } from "@/components/candidats/candidat-actions-menu";

/**
 * En-tête partagé des onglets de la fiche candidat.
 * Rend le lien retour, l'identité (avatar + nom + badges), les actions
 * primaires (fiche d'expression du besoin, modifier), le menu « … » (actions
 * secondaires) puis la barre d'onglets. Chaque page d'onglet le rend UNE fois
 * (pas de layout.tsx sous [id], sinon double en-tête avec les sous-pages).
 */
export function CandidatDetailHeader({
  candidat,
  active,
  t3pTab = false,
}: {
  candidat: {
    id: string;
    prenom: string;
    nom: string;
    statut: CandidatStatut;
    photoUrl: string | null;
    prospectFormCompletedAt: Date | null;
    prospectFormSentAt: Date | null;
  };
  active: CandidatTabKey;
  /** Affiche l'onglet « Parcours T3P » (candidat Taxi/VTC) — cf. getCandidatDetail. */
  t3pTab?: boolean;
}) {
  return (
    <div>
      <Link
        href="/candidats"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux candidats
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {candidat.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={candidat.photoUrl}
              alt={`Photo de ${candidat.prenom} ${candidat.nom}`}
              className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-md ring-1 ring-black/10"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {candidat.prenom.charAt(0)}
              {candidat.nom.charAt(0)}
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight">
            {candidat.prenom} {candidat.nom}
          </h1>
          <Badge variant="secondary">{STATUT_LABELS[candidat.statut]}</Badge>
          {candidat.prospectFormCompletedAt ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              fiche signée
            </Badge>
          ) : candidat.prospectFormSentAt ? (
            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
              lien d&apos;inscription envoyé
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            render={
              <a
                href={`/api/candidats/${candidat.id}/expression-besoin`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <ClipboardCheck className="mr-2 h-4 w-4" /> Fiche d&apos;expression du besoin
          </Button>
          <Button
            variant="outline"
            render={<Link href={`/candidats/${candidat.id}/modifier`} />}
          >
            <Pencil className="mr-2 h-4 w-4" /> Modifier
          </Button>
          <CandidatActionsMenu
            candidatId={candidat.id}
            prenom={candidat.prenom}
            nom={candidat.nom}
            statut={candidat.statut}
            prospectSent={!!candidat.prospectFormSentAt}
          />
        </div>
      </div>

      <div className="mt-4">
        <CandidatTabs candidatId={candidat.id} active={active} showT3P={t3pTab} />
      </div>
    </div>
  );
}
