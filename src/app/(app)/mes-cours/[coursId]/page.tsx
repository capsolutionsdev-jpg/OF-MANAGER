import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, PlayCircle, FileDown, Award } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { embedUrl, pct } from "@/lib/elearning";
import { LeconActions } from "@/components/elearning/lecon-actions";
import { QuizRunner } from "@/components/elearning/quiz-runner";
import type { LeconQuizItem } from "@/lib/validators/cours";

export const dynamic = "force-dynamic";

type Img = { url: string; legende?: string };
type Ressource = { label: string; url: string };

function normQuiz(raw: unknown): LeconQuizItem {
  const q = (raw ?? {}) as Record<string, unknown>;
  if (q.type === "QCU" || q.type === "QCM" || q.type === "REDIGEE") {
    return {
      type: q.type as LeconQuizItem["type"],
      enonce: String(q.enonce ?? ""),
      options: Array.isArray(q.options) ? (q.options as string[]) : [],
      bonnes: Array.isArray(q.bonnes) ? (q.bonnes as number[]) : [],
      corrige: q.corrige ? String(q.corrige) : undefined,
    };
  }
  return {
    type: "QCU",
    enonce: String(q.enonce ?? ""),
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    bonnes: typeof q.reponse === "number" ? [q.reponse] : [],
  };
}

export default async function CoursPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ coursId: string }>;
  searchParams: Promise<{ l?: string }>;
}) {
  const { coursId } = await params;
  const { l } = await searchParams;
  const session = await auth();
  const apprenant = session?.user?.id
    ? await prisma.apprenant.findUnique({ where: { userId: session.user.id } })
    : null;
  if (!apprenant) notFound();

  const acces = await prisma.coursApprenant.findUnique({
    where: { coursId_apprenantId: { coursId, apprenantId: apprenant.id } },
  });
  if (!acces) notFound();

  const cours = await prisma.cours.findUnique({
    where: { id: coursId },
    include: {
      formation: { select: { titre: true } },
      modules: {
        orderBy: { ordre: "asc" },
        include: { lecons: { where: { isPublished: true }, orderBy: { ordre: "asc" } } },
      },
    },
  });
  if (!cours) notFound();

  const [progressions, quizResultats] = await Promise.all([
    prisma.progressionLecon.findMany({
      where: { apprenantId: apprenant.id },
      select: { leconId: true },
    }),
    prisma.quizResultat.findMany({
      where: { apprenantId: apprenant.id },
      select: { leconId: true, score: true, total: true },
    }),
  ]);
  const doneSet = new Set(progressions.map((p) => p.leconId));
  const quizMap = new Map(quizResultats.map((q) => [q.leconId, q]));

  // Liste à plat des leçons (dans l'ordre)
  const flat = cours.modules.flatMap((m) => m.lecons);
  if (flat.length === 0) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Ce cours ne contient pas encore de leçon.
          </CardContent>
        </Card>
      </div>
    );
  }

  const current = flat.find((x) => x.id === l) ?? flat[0];
  const idx = flat.findIndex((x) => x.id === current.id);
  const prevId = idx > 0 ? flat[idx - 1].id : null;
  const nextId = idx < flat.length - 1 ? flat[idx + 1].id : null;

  const totalLecons = flat.length;
  const doneLecons = flat.filter((x) => doneSet.has(x.id)).length;
  const coursePct = pct(doneLecons, totalLecons);

  const video = embedUrl(current.videoUrl);
  const images = (Array.isArray(current.imagesJson) ? current.imagesJson : []) as Img[];
  const ressources = (Array.isArray(current.ressourcesJson)
    ? current.ressourcesJson
    : []) as Ressource[];
  const quiz = (Array.isArray(current.quizJson) ? current.quizJson : []).map(normQuiz);
  const prevQuiz = quizMap.get(current.id) ?? null;

  return (
    <div className="space-y-4">
      <BackLink />

      {/* En-tête + progression du cours */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">{cours.titre}</h1>
            {cours.formation && (
              <p className="text-xs text-muted-foreground">{cours.formation.titre}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-40">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">Progression</span>
                <span className="font-semibold">{coursePct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${coursePct}%` }} />
              </div>
            </div>
            {coursePct === 100 && (
              <Button
                size="sm"
                render={<a href={`/mes-cours/${cours.id}/attestation`} target="_blank" />}
              >
                <Award className="mr-1.5 h-4 w-4" /> Attestation
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* Sommaire */}
        <aside className="space-y-3">
          {cours.modules.map((m, mi) => {
            const mDone = m.lecons.filter((x) => doneSet.has(x.id)).length;
            return (
              <div key={m.id} className="rounded-lg border bg-card">
                <div className="border-b px-3 py-2">
                  <p className="text-sm font-semibold">
                    {mi + 1}. {m.titre}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {mDone}/{m.lecons.length} · {pct(mDone, m.lecons.length)}%
                  </p>
                </div>
                <ul className="p-1.5">
                  {m.lecons.map((lec) => {
                    const active = lec.id === current.id;
                    const isDone = doneSet.has(lec.id);
                    return (
                      <li key={lec.id}>
                        <Link
                          href={`/mes-cours/${cours.id}?l=${lec.id}`}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                            active ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : active ? (
                            <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                          )}
                          <span className="truncate">{lec.titre}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </aside>

        {/* Contenu de la leçon */}
        <main className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-xl font-bold">{current.titre}</h2>

            {video && (
              <div className="mb-4 aspect-video w-full overflow-hidden rounded-lg bg-black">
                <iframe
                  src={video}
                  title={current.titre}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )}

            {current.contenu && (
              <div
                className="prose prose-sm max-w-none text-[15px] leading-relaxed text-foreground [&_a]:text-primary [&_h2]:mt-4 [&_h2]:font-bold [&_li]:ml-4 [&_li]:list-disc [&_p]:my-2"
                dangerouslySetInnerHTML={{ __html: current.contenu }}
              />
            )}

            {images.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {images.map((img, i) => (
                  <figure key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.legende ?? ""} className="w-full rounded-lg border" />
                    {img.legende && (
                      <figcaption className="mt-1 text-center text-xs text-muted-foreground">
                        {img.legende}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}

            {ressources.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold">Ressources</p>
                <ul className="space-y-1.5">
                  {ressources.map((r, i) => (
                    <li key={i}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <FileDown className="h-4 w-4" /> {r.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6">
              <LeconActions
                leconId={current.id}
                coursId={cours.id}
                done={doneSet.has(current.id)}
                prevId={prevId}
                nextId={nextId}
              />
            </div>
          </div>

          {quiz.length > 0 && (
            <QuizRunner leconId={current.id} quiz={quiz} previous={prevQuiz} />
          )}
        </main>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/mes-cours"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Tous mes cours
    </Link>
  );
}
