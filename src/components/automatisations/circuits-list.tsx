"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Loader2, Trash2, GitBranch, ChevronRight } from "lucide-react";
import { createCircuit, toggleCircuitActif, deleteCircuit } from "@/lib/actions/circuit-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

export type CircuitRow = {
  id: string;
  nom: string;
  description: string | null;
  actif: boolean;
  nbEtapes: number;
};

export function CircuitsList({ circuits }: { circuits: CircuitRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [nom, setNom] = useState("");
  const [creating, startCreate] = useTransition();
  const [busy, startBusy] = useTransition();

  const create = () => {
    startCreate(async () => {
      const { id } = await createCircuit(nom || "Nouveau circuit");
      setNom("");
      router.push(`/automatisations/circuits/${id}`);
    });
  };

  return (
    <div className="space-y-5">
      {/* Créer */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") create(); }}
            placeholder="Nom du circuit (ex. Parcours standard Qualiopi)"
            className="h-9 max-w-sm text-sm"
          />
          <Button onClick={create} disabled={creating} size="sm" className="gap-1.5">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Nouveau circuit
          </Button>
        </CardContent>
      </Card>

      {circuits.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucun circuit pour l&apos;instant. Créez-en un pour composer votre timeline d&apos;automatisation.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {circuits.map((c) => (
            <Card key={c.id} className="transition-shadow hover:shadow-sm">
              <CardContent className="flex items-start gap-3 p-4">
                <div className={cn("mt-0.5 rounded-lg p-2", c.actif ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
                  <GitBranch className="h-4 w-4" />
                </div>
                <Link href={`/automatisations/circuits/${c.id}`} className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{c.nom}</span>
                    <Badge variant={c.actif ? "default" : "secondary"} className="shrink-0 text-[10px]">
                      {c.actif ? "Actif" : "Brouillon"}
                    </Badge>
                  </p>
                  {c.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{c.nbEtapes} étape{c.nbEtapes > 1 ? "s" : ""}</p>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant={c.actif ? "outline" : "default"}
                    disabled={busy}
                    onClick={() => startBusy(() => toggleCircuitActif(c.id))}
                    className="h-8"
                  >
                    {c.actif ? "Désactiver" : "Activer"}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={busy}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      if (await confirm({ title: `Supprimer « ${c.nom} » ?`, description: "Le circuit et ses étapes seront supprimés.", destructive: true, confirmLabel: "Supprimer" }))
                        startBusy(() => deleteCircuit(c.id));
                    }}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Link href={`/automatisations/circuits/${c.id}`} className="text-muted-foreground hover:text-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
