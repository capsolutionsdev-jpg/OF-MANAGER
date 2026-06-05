import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ListTree } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACADEMY_LABELS } from "@/lib/validators/formation";
import { CoursForm } from "@/components/elearning/cours-form";
import {
  CoursBuilder,
  type BuilderModule,
} from "@/components/elearning/cours-builder";

export const dynamic = "force-dynamic";

import type { LeconQuizItem, LeconImage } from "@/lib/validators/cours";

type Ressource = { label: string; url: string };

// Normalise un item de quiz (compat ascendante : ancien format { reponse }).
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
  // Ancien format { enonce, options, reponse } → QCU
  return {
    type: "QCU",
    enonce: String(q.enonce ?? ""),
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    bonnes: typeof q.reponse === "number" ? [q.reponse] : [],
  };
}

export default async function CoursManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [cours, formations] = await Promise.all([
    prisma.cours.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { ordre: "asc" },
          include: { lecons: { orderBy: { ordre: "asc" } } },
        },
      },
    }),
    prisma.formation.findMany({
      where: { isArchived: false },
      select: { id: true, titre: true, academy: true },
      orderBy: { titre: "asc" },
    }),
  ]);
  if (!cours) notFound();

  const modules: BuilderModule[] = cours.modules.map((m) => ({
    id: m.id,
    titre: m.titre,
    lecons: m.lecons.map((l) => ({
      id: l.id,
      titre: l.titre,
      contenu: l.contenu ?? "",
      videoUrl: l.videoUrl ?? "",
      dureeMin: l.dureeMin,
      images: (Array.isArray(l.imagesJson)
        ? (l.imagesJson as LeconImage[])
        : []) as LeconImage[],
      ressources: (Array.isArray(l.ressourcesJson)
        ? (l.ressourcesJson as Ressource[])
        : []) as Ressource[],
      quiz: (Array.isArray(l.quizJson) ? l.quizJson : []).map(normQuiz),
      isPublished: l.isPublished,
    })),
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
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{cours.titre}</h1>
          <Badge variant="outline">{ACADEMY_LABELS[cours.academy]}</Badge>
          {cours.isPublished ? (
            <Badge className="bg-emerald-500/10 text-emerald-700">publié</Badge>
          ) : (
            <Badge variant="secondary">brouillon</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Réglages du cours */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Réglages du cours</CardTitle>
          </CardHeader>
          <CardContent>
            <CoursForm
              coursId={cours.id}
              formations={formations}
              defaultValues={{
                titre: cours.titre,
                academy: cours.academy,
                formationId: cours.formationId ?? "",
                description: cours.description ?? "",
                niveau: cours.niveau ?? "",
                imageUrl: cours.imageUrl ?? "",
                isPublished: cours.isPublished,
              }}
            />
          </CardContent>
        </Card>

        {/* Contenu : modules & leçons */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTree className="h-4 w-4" /> Contenu du cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CoursBuilder coursId={cours.id} modules={modules} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
