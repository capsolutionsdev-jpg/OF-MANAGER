import Link from "next/link";
import { Flame, Target } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  scoreCandidat,
  SEGMENT_LABELS,
  SEGMENT_BADGE,
  type Segment,
} from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function ScoringPage() {
  const db = await getTenantDb();
  const candidats = await db.candidat.findMany({
    where: { statut: { notIn: ["ARCHIVE", "INSCRIT"] } },
    select: {
      id: true,
      prenom: true,
      nom: true,
      email: true,
      telephone: true,
      financementType: true,
      valeurEstimee: true,
      crmStage: true,
      relanceDate: true,
      prospectFormCompletedAt: true,
      tags: true,
      createdAt: true,
      formationSouhaitee: { select: { titre: true } },
      _count: { select: { interactionsCandidat: true } },
    },
  });

  const scored = candidats
    .map((c) => ({
      c,
      ...scoreCandidat({
        email: c.email,
        telephone: c.telephone,
        financementType: c.financementType,
        valeurEstimee: c.valeurEstimee ? Number(c.valeurEstimee) : null,
        crmStage: c.crmStage,
        relanceDate: c.relanceDate,
        prospectFormCompletedAt: c.prospectFormCompletedAt,
        interactionsCount: c._count.interactionsCandidat,
        tags: c.tags,
        createdAt: c.createdAt,
      }),
    }))
    .sort((a, b) => b.score - a.score);

  const counts: Record<Segment, number> = { chaud: 0, tiede: 0, froid: 0 };
  for (const s of scored) counts[s.segment]++;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scoring & segmentation"
        subtitle="Score d'engagement calculé automatiquement pour prioriser vos prospects."
      />

      <div className="grid grid-cols-3 gap-4">
        {(["chaud", "tiede", "froid"] as Segment[]).map((seg) => (
          <Card key={seg}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {SEGMENT_LABELS[seg]}
              </p>
              <p className="text-2xl font-bold">{counts[seg]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {scored.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <Target className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Aucun prospect à scorer</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Score</TableHead>
                  <TableHead>Prospect</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead className="hidden md:table-cell">Formation</TableHead>
                  <TableHead className="hidden lg:table-cell">Signaux</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scored.map(({ c, score, segment, reasons }) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {segment === "chaud" && <Flame className="h-4 w-4 text-destructive" />}
                        <span className="text-lg font-bold tabular-nums">{score}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/candidats/${c.id}`} className="hover:underline">
                        {c.prenom} {c.nom}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEGMENT_BADGE[segment]}`}>
                        {SEGMENT_LABELS[segment]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {c.formationSouhaitee?.titre ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {reasons.slice(0, 3).map((r) => (
                          <span key={r} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {r}
                          </span>
                        ))}
                      </div>
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
