import Link from "next/link";
import { GraduationCap, PlayCircle, CheckCircle2 } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ACADEMY_LABELS } from "@/lib/validators/formation";
import { pct } from "@/lib/elearning";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function MesCoursPage() {
  const db = await getTenantDb();
  const session = await auth();
  const apprenant = session?.user?.id
    ? await db.apprenant.findUnique({ where: { userId: session.user.id } })
    : null;

  if (!apprenant) {
    return (
      <div className="space-y-4">
        <PageHeader title="Mes cours" />
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Aucun espace apprenant associé à ce compte. Contactez votre organisme
            de formation.
          </CardContent>
        </Card>
      </div>
    );
  }

  const acces = await db.coursApprenant.findMany({
    where: { apprenantId: apprenant.id },
    include: {
      cours: {
        include: {
          formation: { select: { titre: true } },
          modules: {
            include: { lecons: { where: { isPublished: true }, select: { id: true } } },
          },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  const progressions = await db.progressionLecon.findMany({
    where: { apprenantId: apprenant.id },
    select: { leconId: true },
  });
  const doneSet = new Set(progressions.map((p) => p.leconId));

  return (
    <div className="space-y-6">
      <PageHeader title="Mes cours" subtitle="Retrouvez ici les cours en ligne de votre formation." icon={GraduationCap} />

      {acces.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Aucun cours ne vous a encore été attribué. Votre formateur vous y
            donnera accès prochainement.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {acces.map(({ cours }) => {
            const lecons = cours.modules.flatMap((m) => m.lecons);
            const total = lecons.length;
            const done = lecons.filter((l) => doneSet.has(l.id)).length;
            const p = pct(done, total);
            return (
              <Link
                key={cours.id}
                href={`/mes-cours/${cours.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg"
              >
                {cours.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cours.imageUrl}
                    alt={cours.titre}
                    className="h-32 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-primary/10">
                    <GraduationCap className="h-10 w-10 text-primary/40" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {ACADEMY_LABELS[cours.academy]}
                  </span>
                  <h2 className="mt-1 font-semibold leading-snug">{cours.titre}</h2>
                  {cours.formation && (
                    <p className="text-xs text-muted-foreground">
                      {cours.formation.titre}
                    </p>
                  )}
                  <div className="mt-auto pt-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {done}/{total} leçons
                      </span>
                      <span className="font-semibold">
                        {p === 100 ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Terminé
                          </span>
                        ) : (
                          `${p}%`
                        )}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${p}%` }}
                      />
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      <PlayCircle className="h-4 w-4" />
                      {done === 0 ? "Commencer" : p === 100 ? "Revoir" : "Continuer"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
