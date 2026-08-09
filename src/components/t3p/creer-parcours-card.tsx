"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CarTaxiFront } from "lucide-react";

import { creerParcoursT3P } from "@/lib/actions/t3p-actions";
import { T3P_METIER_LABELS, type T3PMetier } from "@/lib/t3p";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

/**
 * Carte d'ouverture d'un parcours T3P (Taxi ou VTC) pour un candidat.
 * `metierSuggere` est déduit de ses inscriptions / formation souhaitée.
 * `dejaCrees` masque les métiers dont le parcours existe déjà.
 */
export function CreerParcoursCard({
  candidatId,
  metierSuggere,
  dejaCrees = [],
}: {
  candidatId: string;
  metierSuggere: T3PMetier | null;
  dejaCrees?: T3PMetier[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const disponibles = (["TAXI", "VTC"] as const).filter((m) => !dejaCrees.includes(m));
  const [metier, setMetier] = useState<T3PMetier>(
    metierSuggere && disponibles.includes(metierSuggere) ? metierSuggere : (disponibles[0] ?? "VTC"),
  );
  const [mobilite, setMobilite] = useState(false);

  if (disponibles.length === 0) return null;

  function creer() {
    startTransition(async () => {
      const res = await creerParcoursT3P(candidatId, metier, { mobilite });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Parcours ${T3P_METIER_LABELS[metier]} ouvert.`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CarTaxiFront className="h-4 w-4 text-primary" />
          Ouvrir un parcours d&apos;examen Taxi / VTC (CMA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Suivi complet des 11 étapes : prérequis, inscription CMA, frais, épreuves
          théoriques et pratique, jusqu&apos;à la carte professionnelle.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="t3p-metier">Métier visé</Label>
            <select
              id="t3p-metier"
              className={selectClass}
              value={metier}
              onChange={(e) => setMetier(e.target.value as T3PMetier)}
            >
              {disponibles.map((m) => (
                <option key={m} value={m}>
                  {T3P_METIER_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={mobilite}
              onChange={(e) => setMobilite(e.target.checked)}
            />
            Passerelle Taxi↔VTC (mobilité — frais réduits)
          </label>
          <Button onClick={creer} disabled={isPending}>
            {isPending ? "Ouverture…" : "Ouvrir le parcours"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
