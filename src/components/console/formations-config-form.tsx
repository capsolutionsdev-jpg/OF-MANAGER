"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ALL_FORMATIONS, type FormationSlug } from "@/lib/formations-catalog";
import { updateOrganismeFormations } from "@/lib/actions/formations-config-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface FormationsConfigFormProps {
  organismeId: string;
  initialSlugs: string[];
}

export function FormationsConfigForm({
  organismeId,
  initialSlugs,
}: FormationsConfigFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSlugs));

  const handleToggle = (slug: string) => {
    const updated = new Set(selected);
    if (updated.has(slug)) {
      updated.delete(slug);
    } else {
      updated.add(slug);
    }
    setSelected(updated);
  };

  const handleSave = () => {
    const selectedArray = Array.from(selected) as FormationSlug[];
    startTransition(async () => {
      const res = await updateOrganismeFormations(organismeId, selectedArray);
      if (res.ok) {
        toast.success("Formations mises à jour.");
      } else {
        toast.error(res.error ?? "Erreur lors de la mise à jour.");
      }
    });
  };

  // Grouper par catégorie (préfixe du slug)
  const categories = new Map<string, (typeof ALL_FORMATIONS)[number][]>();
  for (const formation of ALL_FORMATIONS) {
    const prefix = formation.slug.split("-")[0];
    if (!categories.has(prefix)) {
      categories.set(prefix, []);
    }
    categories.get(prefix)!.push(formation);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formations</CardTitle>
        <CardDescription>
          Sélectionnez les formations que cet organisme utilise. Les formations cochées
          s&apos;afficheront en console et disposeront des prérequis configurés (CNAPS,
          cartes pro, examens, jury).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from(categories.entries()).map(([category, formations]) => (
          <div key={category}>
            <h4 className="mb-3 font-semibold capitalize text-sm">{category}</h4>
            <div className="space-y-2 pl-2">
              {formations.map((f) => (
                <div key={f.slug} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id={f.slug}
                    checked={selected.has(f.slug)}
                    onChange={() => handleToggle(f.slug)}
                    className="mt-1 h-4 w-4 rounded border-input cursor-pointer"
                  />
                  <Label
                    htmlFor={f.slug}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {f.title}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "Enregistrement…" : "Enregistrer les formations"}
          </Button>
          <p className="text-xs text-muted-foreground self-center">
            {selected.size} formation(s) sélectionnée(s)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
