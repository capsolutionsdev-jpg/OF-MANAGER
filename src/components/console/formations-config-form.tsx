"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ALL_FORMATIONS, migrerSlugs } from "@/lib/formations-catalog";
import { updateOrganismeFormations } from "@/lib/actions/formations-config-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const ORDRE_GROUPES = [
  "SSIAP 1",
  "SSIAP 2",
  "SSIAP 3",
  "Secourisme (SST)",
  "Sécurité privée (CNAPS)",
  "Transport (VTC / Taxi)",
  "Autres",
];

function groupeDe(slug: string): string {
  if (slug.startsWith("ssiap1")) return "SSIAP 1";
  if (slug.startsWith("ssiap2")) return "SSIAP 2";
  if (slug.startsWith("ssiap3")) return "SSIAP 3";
  if (slug === "sst" || slug === "mac-sst") return "Secourisme (SST)";
  if (
    slug.includes("aps") ||
    slug.startsWith("a3p") ||
    slug.startsWith("operateur-videoprotection") ||
    slug.startsWith("dirigeant")
  ) {
    return "Sécurité privée (CNAPS)";
  }
  if (
    slug.includes("vtc") ||
    slug.includes("taxi") ||
    slug === "tpmr" ||
    slug.startsWith("passerelle")
  ) {
    return "Transport (VTC / Taxi)";
  }
  return "Autres";
}

export function FormationsConfigForm({
  organismeId,
  initialSlugs,
}: {
  organismeId: string;
  initialSlugs: string[];
}) {
  const [isPending, startTransition] = useTransition();
  // Config initiale MIGRÉE (alias anciens → clés actuelles) puis filtrée aux
  // identifiants connus : une config héritée d'une ancienne version pré-coche
  // les bonnes cases au lieu d'apparaître décochée.
  const initialSelection = useMemo(
    () => new Set(migrerSlugs(initialSlugs)),
    [initialSlugs],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelection));

  const handleToggle = (slug: string) => {
    const updated = new Set(selected);
    if (updated.has(slug)) updated.delete(slug);
    else updated.add(slug);
    setSelected(updated);
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateOrganismeFormations(organismeId, Array.from(selected));
      if (res.ok) {
        toast.success(
          res.creees && res.creees.length > 0
            ? `Sélection enregistrée — ${res.creees.length} formation(s) créée(s) dans le catalogue du client.`
            : "Sélection enregistrée.",
        );
      } else {
        toast.error(res.error ?? "Erreur lors de la mise à jour.");
      }
    });
  };

  const groupes = new Map<string, typeof ALL_FORMATIONS>();
  for (const f of ALL_FORMATIONS) {
    const g = groupeDe(f.slug);
    if (!groupes.has(g)) groupes.set(g, []);
    groupes.get(g)!.push(f);
  }
  const groupesTries = ORDRE_GROUPES.filter((g) => groupes.has(g));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formations</CardTitle>
        <CardDescription>
          Sélectionnez les formations que ce client vend. Chaque formation cochée
          est créée dans son catalogue depuis le modèle réglementaire (programme,
          examen, jury, pièces) si elle n&apos;y est pas déjà ; décocher la masque
          sans rien supprimer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {groupesTries.map((groupe) => (
          <div key={groupe}>
            <h4 className="mb-2 text-sm font-semibold">{groupe}</h4>
            <div className="space-y-2 pl-2">
              {groupes.get(groupe)!.map((f) => (
                <div key={f.slug} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id={`formation-${f.slug}`}
                    checked={selected.has(f.slug)}
                    onChange={() => handleToggle(f.slug)}
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-input"
                  />
                  <Label
                    htmlFor={`formation-${f.slug}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {f.title}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 border-t pt-4">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Enregistrement…" : "Enregistrer les formations"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {selected.size} formation(s) sélectionnée(s)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
