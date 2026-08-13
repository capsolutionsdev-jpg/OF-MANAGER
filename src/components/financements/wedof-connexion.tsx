"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Link2, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveWedofKey, removeWedofKey } from "@/lib/actions/financements-actions";

/**
 * Carte « Connexion Wedof » : l'OF colle sa clé API pour brancher le suivi des
 * dossiers CPF. La clé est chiffrée côté serveur ; on n'affiche jamais sa valeur.
 */
export function WedofConnexion({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [key, setKey] = useState("");

  function enregistrer() {
    if (!key.trim()) return;
    const fd = new FormData();
    fd.set("wedofApiKey", key.trim());
    start(async () => {
      const r = await saveWedofKey(fd);
      if (r.ok) {
        toast.success("Compte Wedof connecté.");
        setKey("");
        router.refresh();
      } else toast.error(r.error ?? "Échec.");
    });
  }

  function debrancher() {
    start(async () => {
      const r = await removeWedofKey();
      if (r.ok) {
        toast.success("Compte Wedof débranché.");
        router.refresh();
      } else toast.error(r.error ?? "Échec.");
    });
  }

  if (connected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-emerald-50 p-4 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span><b>Compte Wedof connecté.</b> Le suivi des dossiers CPF est actif.</span>
        </div>
        <Button variant="outline" size="sm" onClick={debrancher} disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
          Débrancher
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link2 className="h-5 w-5 text-primary" />
        Collez votre <b>clé API Wedof</b> pour suivre vos dossiers CPF sans double-saisie.
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="wedof-key">Clé API Wedof</Label>
        <Input
          id="wedof-key"
          type="password"
          placeholder="wedof_xxxxxxxxxxxxxxxxxxxx"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Dans Wedof : menu « Mon compte » → « Jetons d&apos;API ». La clé est chiffrée et jamais réaffichée.
        </p>
      </div>
      <Button onClick={enregistrer} disabled={pending || !key.trim()}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Connecter Wedof
      </Button>
    </div>
  );
}
