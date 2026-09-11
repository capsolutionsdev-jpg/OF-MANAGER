"use client";

import { useId, useState, type RefObject } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderTypedSignature, isValidSignatureName } from "@/lib/signature";

/**
 * Alternative ACCESSIBLE au tracé manuscrit (WCAG 2.1.1 — Clavier).
 *
 * Drop-in additif : à placer sous un `<canvas>` de signature existant. Il rend le
 * nom saisi au clavier sur CE MÊME canvas (`renderTypedSignature`) → produit le
 * `data:image/png` attendu par le backend, sans toucher au chemin de dessin.
 * Le composant parent reste maître de son état : `onSigned(dataUrl)` lui permet de
 * poser son drapeau « signé » et/ou de mémoriser le data URL, exactement comme à la
 * fin d'un tracé.
 */
export function TypedSignature({
  canvasRef,
  onSigned,
  defaultName = "",
  className,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onSigned: (dataUrl: string) => void;
  defaultName?: string;
  className?: string;
}) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);

  function apply() {
    const dataUrl = renderTypedSignature(canvasRef.current, name);
    if (dataUrl) onSigned(dataUrl);
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className ?? "text-muted-foreground"}
        onClick={() => setOpen(true)}
      >
        <Keyboard className="mr-1 h-3.5 w-3.5" />
        Je ne peux pas dessiner — signer en tapant mon nom
      </Button>
    );
  }

  return (
    <div className={className ?? "space-y-1.5 rounded-md border bg-muted/30 p-2"}>
      <label htmlFor={inputId} className="block text-xs font-medium">
        Signer en tapant votre nom complet
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={name}
          autoComplete="name"
          placeholder="Prénom NOM"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          className="h-9 flex-1 rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="button" size="sm" onClick={apply} disabled={!isValidSignatureName(name)}>
          Valider ma signature
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Votre nom, avec votre acceptation horodatée, vaut signature électronique.
      </p>
    </div>
  );
}
