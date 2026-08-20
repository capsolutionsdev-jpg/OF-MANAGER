"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createEntrepriseAccount } from "@/lib/actions/entreprise-account-actions";

export function CreateAccessButton({ entrepriseId, hasAccess }: { entrepriseId: string; hasAccess: boolean }) {
  const [pending, start] = useTransition();
  if (hasAccess) return <span className="text-xs text-emerald-600">Accès client actif</span>;
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
      Créer l'accès client
    </Button>
  );
}
