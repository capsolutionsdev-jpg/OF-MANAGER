import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { creerVeille, supprimerVeille } from "@/lib/actions/registre-actions";

export const dynamic = "force-dynamic";

const TYPES: Record<string, { label: string; ind: string; cls: string }> = {
  LEGALE: { label: "Veille légale & réglementaire", ind: "Indicateur 23", cls: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  METIERS: { label: "Veille métiers & compétences", ind: "Indicateur 24", cls: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  PEDAGOGIQUE: { label: "Veille pédagogique & technologique", ind: "Indicateur 25", cls: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};

export default async function VeillePage() {
  const db = await getTenantDb();
  const entrees = await db.veilleEntree.findMany({ orderBy: { date: "desc" } });
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/qualiopi"
          className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Conformité Qualiopi
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Registre de veille</h1>
        <p className="text-sm text-muted-foreground">
          Veille légale, métiers et pédagogique, datée et suivie d&apos;actions (indicateurs 23-24-25).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une entrée de veille</CardTitle>
          <CardDescription>
            Sources utiles : Légifrance, Centre Inffo, France Compétences, INRS, branches professionnelles…
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={creerVeille} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Type de veille</Label>
              <select id="type" name="type" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                {Object.entries(TYPES).map(([v, t]) => (
                  <option key={v} value={v}>{t.label} ({t.ind})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source">Source</Label>
              <Input id="source" name="source" required placeholder="ex. Légifrance, INRS, Centre Inffo…" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sujet">Sujet</Label>
              <Input id="sujet" name="sujet" required placeholder="ex. Évolution du référentiel SST 2026" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="resume">Résumé</Label>
              <textarea id="resume" name="resume" rows={2} className="w-full rounded-md border bg-transparent p-3 text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="action">Action / mise en œuvre dans l&apos;organisme</Label>
              <textarea id="action" name="action" rows={2} className="w-full rounded-md border bg-transparent p-3 text-sm" placeholder="ex. Mise à jour du programme, information des formateurs…" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="lien">Lien (optionnel)</Label>
              <Input id="lien" name="lien" placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Ajouter au registre</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registre ({entrees.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entrees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune entrée. Conseil : ajoutez au moins une entrée datée par trimestre et par type de veille.
            </p>
          ) : (
            entrees.map((e) => {
              const t = TYPES[e.type];
              return (
                <div key={e.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={t.cls}>{t.label}</Badge>
                      <span className="text-sm font-semibold">{e.sujet}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{fmt(e.date)} · {e.source}</span>
                  </div>
                  {e.resume && <p className="mt-2 text-sm text-muted-foreground">{e.resume}</p>}
                  {e.action && (
                    <p className="mt-1 text-sm"><span className="font-medium">Action :</span> {e.action}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    {e.lien && (
                      <a href={e.lien} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> Source
                      </a>
                    )}
                    <form action={supprimerVeille}>
                      <input type="hidden" name="id" value={e.id} />
                      <Button type="submit" size="sm" variant="ghost" className="text-destructive">Supprimer</Button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
