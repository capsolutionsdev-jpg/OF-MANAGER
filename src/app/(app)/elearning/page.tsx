import Link from "next/link";
import { Plus, GraduationCap, BookOpen, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACADEMY_LABELS, ACADEMY_ORDER } from "@/lib/validators/formation";

export const dynamic = "force-dynamic";

export default async function ElearningPage() {
  const cours = await prisma.cours.findMany({
    include: {
      formation: { select: { titre: true } },
      _count: { select: { modules: true } },
      modules: { select: { _count: { select: { lecons: true } } } },
    },
    orderBy: [{ academy: "asc" }, { createdAt: "desc" }],
  });

  const nbLecons = (c: (typeof cours)[number]) =>
    c.modules.reduce((a, m) => a + m._count.lecons, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <GraduationCap className="h-6 w-6" /> E-learning
          </h1>
          <p className="text-sm text-muted-foreground">
            Créez et organisez vos cours en ligne par academy et par formation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/elearning/apprenants" />}>
            <Users className="mr-1.5 h-4 w-4" /> Élèves &amp; accès
          </Button>
          <Button render={<Link href="/elearning/nouveau" />}>
            <Plus className="mr-1.5 h-4 w-4" /> Nouveau cours
          </Button>
        </div>
      </div>

      {cours.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucun cours pour le moment</p>
            <p className="text-sm text-muted-foreground">
              Créez votre premier cours et ajoutez-y des modules et des leçons (texte + vidéo).
            </p>
            <Button className="mt-2" render={<Link href="/elearning/nouveau" />}>
              <Plus className="mr-1.5 h-4 w-4" /> Créer un cours
            </Button>
          </CardContent>
        </Card>
      ) : (
        ACADEMY_ORDER.map((academy) => {
          const list = cours.filter((c) => c.academy === academy);
          if (list.length === 0) return null;
          return (
            <Card key={academy}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {ACADEMY_LABELS[academy]}
                  <Badge variant="secondary">{list.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((c) => (
                  <Link
                    key={c.id}
                    href={`/elearning/${c.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span>
                      <span className="font-medium">{c.titre}</span>
                      {c.formation && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          · {c.formation.titre}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {c._count.modules} module(s) · {nbLecons(c)} leçon(s)
                      {c.isPublished ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700">
                          publié
                        </Badge>
                      ) : (
                        <Badge variant="secondary">brouillon</Badge>
                      )}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
