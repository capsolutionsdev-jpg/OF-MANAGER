import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUT_LABELS, FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { StatutSelect } from "@/components/crm/statut-select";
import { SendProspectLinkButton } from "@/components/crm/send-prospect-link-button";
import {
  QuickEnrollModal,
  type SessionOption,
} from "@/components/inscriptions/quick-enroll-modal";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUT_BADGE: Record<string, string> = {
  NOUVEAU: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  EN_TRAITEMENT: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  INSCRIT: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REFUSE: "bg-red-500/10 text-red-700 dark:text-red-300",
  ARCHIVE: "bg-muted text-muted-foreground",
};

export default async function CrmPage() {
  const db = await getTenantDb();
  // Candidats non archivés avec leur formation souhaitée
  const candidats = await db.candidat.findMany({
    where: { statut: { not: "ARCHIVE" } },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: {
      formationSouhaitee: { select: { id: true, titre: true } },
      _count: { select: { inscriptions: true } },
    },
  });

  // Sessions ouvertes pour inscription
  const sessions = await db.session.findMany({
    where: { statut: { in: ["PLANIFIEE", "OUVERTE", "EN_COURS"] } },
    include: { formation: { select: { id: true, titre: true } } },
    orderBy: { dateDebut: "asc" },
  });

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  const sessionOptions: SessionOption[] = sessions.map((s) => ({
    id: s.id,
    formationId: s.formationId,
    label: `${s.formation.titre} — ${fmt(s.dateDebut)} → ${fmt(s.dateFin)}${
      s.lieu ? ` (${s.lieu})` : ""
    }`,
  }));

  // Groupement des candidats par formation souhaitée
  const groups: Map<
    string | null,
    {
      formationId: string | null;
      formationTitre: string;
      items: typeof candidats;
    }
  > = new Map();

  for (const c of candidats) {
    const key = c.formationSouhaiteeId ?? null;
    if (!groups.has(key)) {
      groups.set(key, {
        formationId: key,
        formationTitre: c.formationSouhaitee?.titre ?? "Sans formation précisée",
        items: [],
      });
    }
    groups.get(key)!.items.push(c);
  }

  // "Sans formation" à la fin
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return 0;
  });

  const total = candidats.length;

  // Récapitulatif des sources d'acquisition (d'où vient le trafic)
  const sourceCounts = new Map<string, number>();
  for (const c of candidats) {
    const key = c.sourceConnaissance?.trim() || "Non renseigné";
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }
  const sources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxSource = sources.length ? sources[0][1] : 0;

  // Taux de conversion (gagnés / total) + relances en retard
  const gagnes = candidats.filter((c) => c.crmStage === "GAGNE").length;
  const inscrits = candidats.filter((c) => c.statut === "INSCRIT").length;
  const tauxConversion = total > 0 ? Math.round((gagnes / total) * 100) : 0;
  const now = new Date();
  const relancesEnRetard = candidats.filter(
    (c) => c.relanceDate && c.relanceDate <= now && c.statut !== "INSCRIT",
  ).length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <PageHeader
        title="CRM — Prospects & inscriptions"
        subtitle={`${total} prospect${total !== 1 ? "s" : ""} actif${total !== 1 ? "s" : ""}, classés par formation souhaitée`}
      >
        <Button variant="outline" render={<Link href="/crm/pipeline" />}>
          <TrendingUp className="mr-1.5 h-4 w-4" />
          Pipeline
        </Button>
        <Button render={<Link href="/candidats/nouveau" />}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau prospect
        </Button>
      </PageHeader>

      {/* KPI commerciaux */}
      {total > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Prospects actifs
              </p>
              <p className="text-2xl font-bold">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Taux de conversion
              </p>
              <p className="text-2xl font-bold">{tauxConversion}%</p>
              <p className="text-xs text-muted-foreground">{gagnes} gagné(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Inscrits
              </p>
              <p className="text-2xl font-bold">{inscrits}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Relances en retard
              </p>
              <p
                className={`text-2xl font-bold ${relancesEnRetard > 0 ? "text-red-600" : ""}`}
              >
                {relancesEnRetard}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sources d'acquisition — d'où vient le trafic */}
      {total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Sources d&apos;acquisition
              <span className="text-xs font-normal text-muted-foreground">
                (comment les prospects nous ont connus)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sources.map(([src, n]) => (
              <div key={src} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 truncate">{src}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${maxSource ? (n / maxSource) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-muted-foreground">
                  {n} ({Math.round((n / total) * 100)}%)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {total === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucun prospect pour le moment</p>
            <p className="text-sm text-muted-foreground">
              Créez votre premier prospect pour commencer le suivi.
            </p>
          </div>
        </Card>
      ) : (
        sortedGroups.map(([, grp]) => (
          <Card key={grp.formationId ?? "__none__"}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span>{grp.formationTitre}</span>
                <Badge variant="secondary">{grp.items.length}</Badge>
                {grp.formationId && (
                  <Link
                    href={`/formations/${grp.formationId}`}
                    className="ml-auto text-xs font-normal text-muted-foreground hover:underline"
                  >
                    Voir la formation →
                  </Link>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidat</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Téléphone
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">Ville</TableHead>
                    <TableHead>Financement</TableHead>
                    <TableHead>État</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grp.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/candidats/${c.id}`}
                          className="hover:underline"
                        >
                          {c.prenom} {c.nom}
                        </Link>
                        {c._count.inscriptions > 0 && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({c._count.inscriptions} inscription
                            {c._count.inscriptions > 1 ? "s" : ""})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {c.email}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {c.telephone ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {c.ville ?? "—"}
                      </TableCell>
                      <TableCell>
                        {c.financementType ? (
                          <Badge variant="outline" className="text-xs">
                            {FINANCEMENT_LABELS[c.financementType]}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${STATUT_BADGE[c.statut] ?? ""}`}
                        >
                          {STATUT_LABELS[c.statut]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {/* Fiche prospect : statut */}
                          {c.prospectFormCompletedAt ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                              fiche signée
                            </Badge>
                          ) : c.prospectFormSentAt ? (
                            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              lien envoyé
                            </Badge>
                          ) : null}
                          {/* Envoi du lien de la fiche d'inscription */}
                          {c.statut !== "INSCRIT" && (
                            <SendProspectLinkButton
                              candidatId={c.id}
                              sent={!!c.prospectFormSentAt}
                            />
                          )}
                          {/* Changement de statut rapide */}
                          <StatutSelect id={c.id} statut={c.statut} />
                          {/* Inscription rapide à une session */}
                          {c.statut !== "INSCRIT" && (
                            <QuickEnrollModal
                              candidatId={c.id}
                              candidatName={`${c.prenom} ${c.nom}`}
                              sessions={sessionOptions}
                              formationId={grp.formationId ?? undefined}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
