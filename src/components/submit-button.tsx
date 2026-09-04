"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bouton de soumission qui se désactive et affiche un spinner pendant l'envoi du
 * `<form action>` parent — empêche les doubles soumissions / doublons (Cm6).
 * À utiliser comme enfant direct d'un `<form action={serverAction}>`.
 */
export function SubmitButton({
  children,
  pendingLabel = "Enregistrement…",
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
