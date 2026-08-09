import Link from "next/link";
import { CarTaxiFront } from "lucide-react";
import type { T3PMetier as T3PMetierPrisma, ParcoursT3PStatut } from "@prisma/client";

import { getTenantDb } from "@/lib/tenant";
import {
  T3P_METIER_LABELS,
  T3P_STATUT_LABELS,
  alertePrincipale,
  etapeCourante,
  parcoursEtapes,
  progression,
} from "@/lib/t3p";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Pilotage des parcours d'examen Taxi / VTC (T3P — CMA) : tous les candidats
 * en parcours, leur étape courante et les alertes d'échéances réglementaires
 * (délai d'1 an après l'admissibilité, 3 présentations max à l'admission).
 */
export default async function ParcoursT3PListePage({
  searchParams,
}: {
  searchParams: Promise<{ metier?: string; statut?: string }>;
}) {
  const sp = await searchParams;
  const metier: T3PMetierPrisma | undefined =
    sp.metier === "TAXI" || sp.metier === "VTC" ? sp.metier : undefined;
  const statut: ParcoursT3PStatut | undefined =
    sp.statut === "TOUS"
      ? undefined
      : sp.statut === "REUSSI" || sp.statut === "ABANDONNE"
        ? sp.statut
        : "EN_COURS";

  const db = await getTenantDb();
  const parcours = await db.parcoursT3P.findMany({
    where: { ...(metier ? { metier } : {}), ...(statut ? { statut } : {}) },
    include: {
      candidat: { select: { id: true, nom: true, prenom: true } },
      epreuves: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows = parcours.map((p) => {
    const etapes = parcoursEtapes(p);
    return {
      p,
      courante: etapeCourante(etapes),
      alerte: alertePrincipale(etapes),
      prog: progression(etapes),
    };
  });
  // Alertes graves d'abord (danger > warn > info > aucune), puis récents.
  const poids = { danger: 3, warn: 2, info: 1 } as const;
  rows.sort((a, b) => (b.alerte ? poids[b.alerte.niveau] : 0) - (a.alerte ? poids[a.alerte.niveau] : 0));

  const filtre = (m?: string, s?: string) => {
    const q = new URLSearchParams();
    if (m) q.set("metier", m);
    if (s) q.set("statut", s);
    const str = q.toString();
    return `/parcours-t3p${str ? `?${str}` : ""}`;
  };
  const statutCourant = statut ?? "TOUS";
  const pill = (actif: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      actif ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
    }`;

  const alerteBadge = {
    danger: "bg-red-500/10 text-red-700 dark:text-red-300",
    warn: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    info: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  } as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parcours T3P — Taxi / VTC"
        subtitle="Suivi des parcours d'examen CMA : étape courante, épreuves et échéances réglementaires."
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Métier :</span>
        <Link href={filtre(undefined, sp.statut)} className={pill(!metier)}>Tous</Link>
        <Link href={filtre("TAXI", sp.statut)} className={pill(metier === "TAXI")}>Taxi</Link>
        <Link href={filtre("VTC", sp.statut)} className={pill(metier === "VTC")}>VTC</Link>
        <span className="ml-3 text-xs uppercase tracking-wide text-muted-foreground">Statut :</span>
        <Link href={filtre(sp.metier, "EN_COURS")} className={pill(statutCourant === "EN_COURS")}>En cours</Link>
        <Link href={filtre(sp.metier, "REUSSI")} className={pill(statutCourant === "REUSSI")}>Réussis</Link>
        <Link href={filtre(sp.metier, "ABANDONNE")} className={pill(statutCourant === "ABANDONNE")}>Abandonnés</Link>
        <Link href={filtre(sp.metier, "TOUS")} className={pill(statutCourant === "TOUS")}>Tous</Link>
      </div>

      <Card>
        <CardContent className="pt-4">
          {rows.length === 0 ? (
            <EmptyState
              icon={CarTaxiFront}
              title="Aucun parcours"
              description="Les parcours s'ouvrent automatiquement à l'inscription d'un candidat sur une session Taxi/VTC, ou manuellement depuis l'onglet « Parcours T3P » de sa fiche."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Métier</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Étape courante</TableHead>
                  <TableHead>Alerte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ p, courante, alerte, prog }) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/candidats/${p.candidat.id}/parcours-t3p`}
                        className="font-medium text-primary hover:underline"
                      >
                        {p.candidat.prenom} {p.candidat.nom}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {T3P_METIER_LABELS[p.metier]}
                      {p.mobilite && (
                        <Badge variant="secondary" className="ml-1">mobilité</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.statut === "REUSSI"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : p.statut === "ABANDONNE"
                              ? "bg-red-500/10 text-red-700 dark:text-red-300"
                              : "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                        }
                      >
                        {T3P_STATUT_LABELS[p.statut]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {prog.faites}/{prog.total}
                    </TableCell>
                    <TableCell className="text-sm">
                      {courante.num}. {courante.label}
                    </TableCell>
                    <TableCell className="max-w-md">
                      {alerte ? (
                        <Badge className={alerteBadge[alerte.niveau]}>{alerte.message}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
