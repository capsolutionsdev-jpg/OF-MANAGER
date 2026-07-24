import Link from "next/link";
import { Globe, ExternalLink, Rocket, EyeOff, PauseCircle } from "lucide-react";
import type { Academy } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VITRINE_STATUT_LABELS } from "@/lib/validators/formation";
import { saveVitrineRowAction } from "@/lib/actions/vitrine-actions";

export const metadata = { title: "Site vitrine" };

// URL publique du site vitrine (lecture seule pour l'ADMIN, ouverte en onglet).
const VITRINE_URL = "https://capacademy.fr";

// Mappe l'académie (côté manager) vers la catégorie/slug d'URL du site vitrine.
const ACADEMY_TO_CATEGORIE: Record<Academy, string> = {
  SAFETY: "securite",
  TRANSPORT: "transport",
  DIGITAL: "digital",
  LANGUE: "langues",
};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

const STATUT_BADGE: Record<
  string,
  { variant: "default" | "secondary" | "destructive"; label: string }
> = {
  PUBLIEE: { variant: "default", label: "En ligne" },
  MASQUEE: { variant: "secondary", label: "Brouillon" },
  SUSPENDUE: { variant: "destructive", label: "Suspendue" },
};

export default async function SiteVitrinePage() {
  const db = await getTenantDb();
  const formations = await db.formation.findMany({
    where: { isArchived: false },
    orderBy: { titre: "asc" },
    select: {
      id: true,
      titre: true,
      reference: true,
      academy: true,
      vitrineStatut: true,
      tarif: true,
      duree: true,
      dureeHeures: true,
    },
  });

  const nb = {
    PUBLIEE: formations.filter((f) => f.vitrineStatut === "PUBLIEE").length,
    MASQUEE: formations.filter((f) => f.vitrineStatut === "MASQUEE").length,
    SUSPENDUE: formations.filter((f) => f.vitrineStatut === "SUSPENDUE").length,
  };

  // En ligne d'abord, puis brouillons, puis suspendues ; alpha en second critère.
  const ordre: Record<string, number> = { PUBLIEE: 0, MASQUEE: 1, SUSPENDUE: 2 };
  const rows = [...formations].sort(
    (a, b) =>
      (ordre[a.vitrineStatut] ?? 9) - (ordre[b.vitrineStatut] ?? 9) ||
      a.titre.localeCompare(b.titre),
  );

  const stats = [
    { key: "PUBLIEE", icon: Rocket, label: "En ligne", value: nb.PUBLIEE },
    { key: "MASQUEE", icon: EyeOff, label: "Brouillons (non publiés)", value: nb.MASQUEE },
    { key: "SUSPENDUE", icon: PauseCircle, label: "Suspendues", value: nb.SUSPENDUE },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site vitrine"
        subtitle="Pilotez ce qui s'affiche sur capacademy.fr : publication, tarif et durée de chaque formation. Les changements apparaissent sur le site public sous ~5 min."
      >
        <Button variant="outline" render={<a href={VITRINE_URL} target="_blank" rel="noopener noreferrer" />}>
          <Globe className="mr-2 h-4 w-4" />
          Voir le site
          <ExternalLink className="ml-2 h-3.5 w-3.5" />
        </Button>
      </PageHeader>

      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.key}>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="rounded-xl bg-muted p-2.5">
                <s.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {formations.length === 0 ? (
        <Card>
          <EmptyState
            icon={Globe}
            title="Aucune formation à publier"
            description="Créez une formation, puis revenez ici pour la mettre en ligne sur le site vitrine."
            actionLabel="Créer une formation"
            actionHref="/formations/nouvelle"
          />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pilotage des fiches ({formations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {rows.map((f) => {
                const badge = STATUT_BADGE[f.vitrineStatut] ?? STATUT_BADGE.MASQUEE;
                const categorie = f.academy ? ACADEMY_TO_CATEGORIE[f.academy] : null;
                const ficheUrl =
                  categorie && f.vitrineStatut === "PUBLIEE"
                    ? `${VITRINE_URL}/formations/${categorie}/${f.reference}`
                    : null;
                return (
                  <form
                    key={f.id}
                    action={saveVitrineRowAction}
                    className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:gap-4"
                  >
                    <input type="hidden" name="id" value={f.id} />

                    {/* Identité de la fiche */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/formations/${f.id}`}
                          className="truncate font-medium hover:underline"
                        >
                          {f.titre}
                        </Link>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-mono">slug&nbsp;: {f.reference}</span>
                        {ficheUrl && (
                          <a
                            href={ficheUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            Voir la fiche <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Statut */}
                    <div className="w-full lg:w-52">
                      <label
                        htmlFor={`statut-${f.id}`}
                        className="mb-1 block text-xs font-medium text-muted-foreground"
                      >
                        Statut
                      </label>
                      <select
                        id={`statut-${f.id}`}
                        name="vitrineStatut"
                        defaultValue={f.vitrineStatut}
                        className={selectClass}
                      >
                        {Object.entries(VITRINE_STATUT_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tarif */}
                    <div className="w-full lg:w-32">
                      <label
                        htmlFor={`tarif-${f.id}`}
                        className="mb-1 block text-xs font-medium text-muted-foreground"
                      >
                        Tarif (€ HT)
                      </label>
                      <Input
                        id={`tarif-${f.id}`}
                        name="tarif"
                        inputMode="decimal"
                        placeholder="—"
                        defaultValue={f.tarif != null ? String(Number(f.tarif)) : ""}
                        className="h-8"
                      />
                    </div>

                    {/* Durée */}
                    <div className="w-full lg:w-44">
                      <label
                        htmlFor={`duree-${f.id}`}
                        className="mb-1 block text-xs font-medium text-muted-foreground"
                      >
                        Durée
                      </label>
                      <Input
                        id={`duree-${f.id}`}
                        name="duree"
                        placeholder="ex. 21h"
                        defaultValue={f.duree ?? ""}
                        className="h-8"
                      />
                      <input
                        type="hidden"
                        name="dureeHeures"
                        value={f.dureeHeures ?? ""}
                      />
                    </div>

                    <Button type="submit" variant="secondary" className="shrink-0">
                      Enregistrer
                    </Button>
                  </form>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
