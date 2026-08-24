"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createEntrepriseAccount, renvoyerInvitationEntreprise } from "@/lib/actions/entreprise-account-actions";

export function CreateAccessButton({ entrepriseId, hasAccess }: { entrepriseId: string; hasAccess: boolean }) {
  const [pending, start] = useTransition();

  if (hasAccess) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs text-emerald-600">Accès client actif</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground"
          disabled={pending}
          title="Régénère un lien et renvoie l'e-mail d'invitation au client"
          onClick={() => start(async () => {
            const r = await renvoyerInvitationEntreprise(entrepriseId);
            if (!r.ok) toast.error(r.error ?? "Erreur");
            else if (r.error) toast.warning(r.error);
            else toast.success("Invitation renvoyée au client.");
          })}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Renvoyer l&apos;invitation
        </Button>
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => start(async () => {
        const r = await createEntrepriseAccount(entrepriseId);
        if (!r.ok) toast.error(r.error ?? "Erreur");
        else if (r.error) toast.warning(r.error);
        else toast.success("Invitation envoyée au client.");
      })}
    >
      Créer l&apos;accès client
    </Button>
  );
}
