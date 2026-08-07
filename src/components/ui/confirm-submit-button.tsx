"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useConfirm, type ConfirmOptions } from "@/components/ui/confirm-dialog";

// Bouton de soumission de formulaire (server action) protégé par la fenêtre de
// confirmation macOS. À utiliser pour les actions destructives déclenchées par
// un <form action={serverAction}> : on intercepte le clic, on demande
// confirmation, puis on soumet le formulaire seulement si l'utilisateur valide.
export function ConfirmSubmitButton({
  confirm: options,
  children,
  variant = "outline",
  size,
  className,
}: {
  confirm: ConfirmOptions;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const confirm = useConfirm();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      onClick={async (e) => {
        e.preventDefault();
        const form = (e.currentTarget as HTMLButtonElement).form;
        if (await confirm(options)) form?.requestSubmit();
      }}
    >
      {children}
    </Button>
  );
}
