"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontal,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Trash2,
  FileText,
  Send,
} from "lucide-react";
import { InscriptionStatut } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  setInscriptionStatut,
  deleteInscriptionAction,
} from "@/lib/actions/inscription-actions";
import { relanceParcours } from "@/lib/actions/parcours-actions";

export function InscriptionActionsMenu({
  inscriptionId,
  sessionId,
  candidatId,
  statut,
}: {
  inscriptionId: string;
  sessionId: string;
  candidatId: string;
  statut: InscriptionStatut;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeStatut(next: InscriptionStatut, label: string) {
    startTransition(async () => {
      const res = await setInscriptionStatut(inscriptionId, next);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success(label);
      router.refresh();
    });
  }

  function envoyerLien() {
    startTransition(async () => {
      const res = await relanceParcours(inscriptionId);
      if (!res.ok) {
        toast.error(res.error ?? "Envoi impossible.");
        return;
      }
      toast.success(
        res.demo
          ? "Lien généré (mode démo : e-mail non envoyé — configurez Brevo)."
          : "Lien d'inscription envoyé au candidat par e-mail.",
      );
      router.refresh();
    });
  }

  function retirer() {
    if (
      !confirm(
        "Retirer définitivement ce candidat de la session ? Cette action supprime l'inscription.",
      )
    )
      return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", inscriptionId);
      fd.set("sessionId", sessionId);
      fd.set("candidatId", candidatId);
      await deleteInscriptionAction(fd);
      toast.success("Candidat retiré de la session.");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Actions"
            disabled={isPending}
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Inscription</DropdownMenuLabel>
        {statut !== "VALIDEE" && (
          <DropdownMenuItem
            onClick={() => changeStatut("VALIDEE", "Inscription confirmée.")}
          >
            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
            Confirmer l&apos;inscription
          </DropdownMenuItem>
        )}
        {statut !== "SUSPENDUE" && (
          <DropdownMenuItem
            onClick={() => changeStatut("SUSPENDUE", "Inscription suspendue.")}
          >
            <PauseCircle className="mr-2 h-4 w-4 text-amber-600" />
            Suspendre
          </DropdownMenuItem>
        )}
        {statut !== "EN_ATTENTE" && (
          <DropdownMenuItem
            onClick={() => changeStatut("EN_ATTENTE", "Remise en attente.")}
          >
            <PauseCircle className="mr-2 h-4 w-4 text-muted-foreground" />
            Remettre en attente
          </DropdownMenuItem>
        )}
        {statut !== "ANNULEE" && (
          <DropdownMenuItem
            onClick={() => changeStatut("ANNULEE", "Inscription annulée.")}
          >
            <XCircle className="mr-2 h-4 w-4 text-destructive" />
            Annuler l&apos;inscription
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={envoyerLien}>
          <Send className="mr-2 h-4 w-4 text-primary" />
          Envoyer le lien (compléter + signer)
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<a href={`/documents/${inscriptionId}/pdf`} target="_blank" />}
        >
          <FileText className="mr-2 h-4 w-4" />
          Dossier (PDF)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={retirer} variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Retirer de la session
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
