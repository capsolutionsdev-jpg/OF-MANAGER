"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { setDevisStatut, requestDevisSignature } from "@/lib/actions/devis-actions";

// Boutons de changement de statut d'un devis, avec retour utilisateur (toast)
// et état de chargement — fin des actions « silencieuses » (cf. audit FRT-01).
export function DevisStatutButtons({
  id,
  actions,
}: {
  id: string;
  actions: { statut: string; label: string }[];
}) {
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  return (
    <>
      {actions.map((a) => (
        <Button
          key={a.statut}
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={async () => {
            if (
              a.statut === "ANNULEE" &&
              !(await confirm({
                title: "Annuler ce devis ?",
                description: "Le devis sera marqué comme refusé/annulé.",
                destructive: true,
                confirmLabel: "Annuler le devis",
                cancelLabel: "Retour",
              }))
            )
              return;
            start(async () => {
              const fd = new FormData();
              fd.set("id", id);
              fd.set("statut", a.statut);
              const r = await setDevisStatut(fd);
              if (r.ok) toast.success("Statut mis à jour.");
              else toast.error(r.error);
            });
          }}
        >
          {a.label}
        </Button>
      ))}
    </>
  );
}

// Génération du lien d'acceptation/signature en ligne, avec retour utilisateur.
export function GenerateSignatureLinkButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("id", id);
          const r = await requestDevisSignature(fd);
          if (r.ok) toast.success("Lien de signature généré.");
          else toast.error(r.error);
        })
      }
    >
      <FileSignature className="mr-2 h-4 w-4" /> Générer le lien de signature
    </Button>
  );
}
