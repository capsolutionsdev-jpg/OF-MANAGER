"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Calculator, Send, FileDown, Trash2 } from "lucide-react";
import { CandidatStatut } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sendProspectIntakeLink } from "@/lib/actions/prospect-actions";
import { anonymiseCandidat } from "@/lib/actions/rgpd-actions";

/**
 * Actions secondaires de la fiche candidat regroupées dans un menu « … »
 * (simuler le financement, lien prospect, export RGPD, anonymisation).
 * Réimplémente les mêmes appels serveur que les anciens boutons pleins
 * (SendProspectLinkButton / <form> d'anonymisation) sous forme d'items — même
 * pattern que InscriptionActionsMenu.
 */
export function CandidatActionsMenu({
  candidatId,
  prenom,
  nom,
  statut,
  prospectSent,
}: {
  candidatId: string;
  prenom: string;
  nom: string;
  statut: CandidatStatut;
  prospectSent: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  function envoyerLienProspect() {
    startTransition(async () => {
      const res = await sendProspectIntakeLink(candidatId);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success(res.error ?? "Lien d'inscription envoyé au prospect.");
      router.refresh();
    });
  }

  async function anonymiser() {
    if (
      !(await confirm({
        title: `Anonymiser ${prenom} ${nom} ?`,
        description:
          "Les données personnelles seront effacées de façon irréversible (RGPD). Le dossier ne pourra plus être identifié.",
        destructive: true,
        confirmLabel: "Anonymiser",
      }))
    )
      return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("candidatId", candidatId);
      await anonymiseCandidat(fd);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" aria-label="Actions" disabled={isPending} />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={
            <Link
              href={`/simulateur-financement?prenom=${encodeURIComponent(prenom)}&nom=${encodeURIComponent(nom)}`}
            />
          }
        >
          <Calculator className="mr-2 h-4 w-4" />
          Simuler le financement
        </DropdownMenuItem>
        {statut !== "INSCRIT" && (
          <DropdownMenuItem onClick={envoyerLienProspect}>
            <Send className="mr-2 h-4 w-4 text-primary" />
            {prospectSent ? "Renvoyer le lien prospect" : "Lien d'inscription (prospect)"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem render={<a href={`/candidats/${candidatId}/export`} />}>
          <FileDown className="mr-2 h-4 w-4" />
          Exporter RGPD
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={anonymiser} variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Anonymiser
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
