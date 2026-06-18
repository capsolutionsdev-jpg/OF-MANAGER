"use client";

import { useState, useSyncExternalStore } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const noop = () => () => {};

/** Affiche le lien public d'acceptation du devis et permet de le copier. */
export function CopyAcceptLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  // Origine lue côté client sans effet ni setState (évite le mismatch
  // d'hydratation : "" rendu sur le serveur, origine réelle sur le client).
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const url = origin ? `${origin}${path}` : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copie impossible — sélectionnez le lien manuellement.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input readOnly value={url} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
      <Button type="button" size="sm" variant="outline" onClick={copy}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <Button type="button" size="sm" variant="outline" render={<a href={url} target="_blank" rel="noreferrer" />}>
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
}
