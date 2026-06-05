import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACADEMY_LABELS } from "@/lib/validators/formation";
import {
  ApprenantManager,
  type CoursOption,
} from "@/components/elearning/apprenant-manager";

export const dynamic = "force-dynamic";

export default async function ApprenantsElearningPage() {
  const [candidats, coursList] = await Promise.all([
    prisma.candidat.findMany({
      where: { inscriptions: { some: {} } },
      include: {
        apprenant: {
          include: {
            user: { select: { email: true } },
            coursAssignes: { select: { coursId: true } },
            _count: { select: { progressions: true } },
          },
        },
        inscriptions: {
          include: {
            session: {
              include: { formation: { select: { titre: true, academy: true } } },
            },
          },
        },
      },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    prisma.cours.findMany({
      where: { isPublished: true },
      select: { id: true, titre: true, academy: true },
      orderBy: [{ academy: "asc" }, { titre: "asc" }],
    }),
  ]);

  const cours: CoursOption[] = coursList.map((c) => ({
    id: c.id,
    titre: c.titre,
    academy: c.academy,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/elearning"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;e-learning
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users className="h-6 w-6" /> Élèves & accès
        </h1>
        <p className="text-sm text-muted-foreground">
          Créez les comptes des candidats inscrits et attribuez-leur les cours.
        </p>
      </div>

      {candidats.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Aucun candidat inscrit pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {candidats.map((c) => {
            const formations = Array.from(
              new Map(
                c.inscriptions.map((i) => [
                  i.session.formation.titre,
                  i.session.formation,
                ]),
              ).values(),
            );
            const assignedIds = c.apprenant?.coursAssignes.map((x) => x.coursId) ?? [];
            return (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {c.prenom} {c.nom}
                    <span className="text-xs font-normal text-muted-foreground">
                      {c.email}
                    </span>
                    {formations.map((f) => (
                      <Badge key={f.titre} variant="outline" className="text-[10px]">
                        {ACADEMY_LABELS[f.academy ?? "DIGITAL"]} · {f.titre}
                      </Badge>
                    ))}
                    {c.apprenant && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {c.apprenant._count.progressions} leçon(s) terminée(s)
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ApprenantManager
                    candidatId={c.id}
                    apprenantId={c.apprenant?.id ?? null}
                    hasAccount={!!c.apprenant?.userId}
                    login={c.apprenant?.user?.email ?? null}
                    cours={cours}
                    assignedIds={assignedIds}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
