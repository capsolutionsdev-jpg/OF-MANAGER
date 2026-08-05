"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, Info } from "lucide-react";
import { AGREMENT_FAMILLES, type AgrementsConfig } from "@/lib/agrements";
import { updateAgrements } from "@/lib/actions/agrements-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Saisie des agréments de l'organisme, un par famille de formations.
 * Tous les champs sont facultatifs : un agrément peut ne pas encore être délivré.
 */
export function AgrementsForm({ initial }: { initial: AgrementsConfig }) {
  const router = useRouter();
  const [v, setV] = useState<AgrementsConfig>(initial);
  const [pending, start] = useTransition();

  const set = (k: keyof AgrementsConfig, val: string) => setV((s) => ({ ...s, [k]: val }));

  function save() {
    start(async () => {
      const r = await updateAgrements(v);
      if (r.ok) {
        toast.success("Agréments enregistrés.");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Un agrément couvre toute une famille de formations. Laissez vide un agrément non encore
          délivré : il sera simplement absent des documents. Les habilitations électriques
          (H0B0, BS/BE) ne requièrent aucun agrément.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agréments &amp; autorisations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {AGREMENT_FAMILLES.map((f) => (
            <div key={f.key} className="grid gap-2 border-b pb-4 last:border-0 last:pb-0">
              <Label htmlFor={f.key}>{f.label}</Label>
              <p className="-mt-1 text-xs text-muted-foreground">Couvre : {f.couvre}</p>
              {f.key === "ssiap" ? (
                <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
                  <div className="grid gap-1.5">
                    <Label htmlFor="ssiapDepartement" className="text-xs font-normal text-muted-foreground">
                      Département
                    </Label>
                    <Input
                      id="ssiapDepartement"
                      value={v.ssiapDepartement ?? ""}
                      onChange={(e) => set("ssiapDepartement", e.target.value)}
                      placeholder="093"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ssiap" className="text-xs font-normal text-muted-foreground">
                      N° d&apos;agrément
                    </Label>
                    <Input
                      id="ssiap"
                      value={v.ssiap ?? ""}
                      onChange={(e) => set("ssiap", e.target.value)}
                      placeholder={f.placeholder}
                    />
                  </div>
                </div>
              ) : (
                <Input
                  id={f.key}
                  value={(v[f.key] as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              )}
              {f.key === "ssiap" && (
                <p className="text-xs text-muted-foreground">
                  Utilisés dans le numéro des diplômes SSIAP :{" "}
                  <span className="font-mono">
                    {(v.ssiapDepartement || "0XX")}-{(v.ssiap || "XXXX")}-1-{new Date().getFullYear()}-00001
                  </span>
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
