import Link from "next/link";
import { Plus, Newspaper, Pencil, ExternalLink } from "lucide-react";
import type { VitrineStatut } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setArticleStatutAction } from "@/lib/actions/article-actions";

export const metadata = { title: "Blog" };

const VITRINE_URL = "https://ofmanager.info";

const STATUT_BADGE: Record<
  VitrineStatut,
  { variant: "default" | "secondary" | "destructive"; label: string }
> = {
  PUBLIEE: { variant: "default", label: "En ligne" },
  MASQUEE: { variant: "secondary", label: "Brouillon" },
  SUSPENDUE: { variant: "destructive", label: "Retiré" },
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function BlogPage() {
  const db = await getTenantDb();
  const articles = await db.article.findMany({
    where: { isArchived: false },
    orderBy: { datePublication: "desc" },
  });

  const nbPubli = articles.filter((a) => a.statut === "PUBLIEE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog"
        subtitle={`${articles.length} article${articles.length > 1 ? "s" : ""} — ${nbPubli} en ligne sur votre site vitrine. Les publications apparaissent sur le site sous ~5 min.`}
      >
        <Button
          variant="outline"
          render={
            <a href={`${VITRINE_URL}/blog`} target="_blank" rel="noopener noreferrer" />
          }
        >
          <ExternalLink className="mr-2 h-3.5 w-3.5" />
          Voir le blog
        </Button>
        <Button render={<Link href="/blog/nouveau" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel article
        </Button>
      </PageHeader>

      {articles.length === 0 ? (
        <Card>
          <EmptyState
            icon={Newspaper}
            title="Aucun article"
            description="Rédigez votre premier article : il s'affichera sur le blog du site vitrine une fois publié."
            actionLabel="Écrire un article"
            actionHref="/blog/nouveau"
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table className="stagger-rows">
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((a) => {
                  const badge = STATUT_BADGE[a.statut];
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        <Link href={`/blog/${a.id}`} className="hover:underline">
                          {a.titre}
                        </Link>
                        <div className="font-mono text-xs text-muted-foreground">
                          {a.slug}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.categorie ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(a.datePublication)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {a.statut === "PUBLIEE" ? (
                            <form action={setArticleStatutAction}>
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="statut" value="MASQUEE" />
                              <Button type="submit" variant="outline" size="sm">
                                Dépublier
                              </Button>
                            </form>
                          ) : (
                            <form action={setArticleStatutAction}>
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="statut" value="PUBLIEE" />
                              <Button type="submit" variant="secondary" size="sm">
                                Publier
                              </Button>
                            </form>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/blog/${a.id}`} />}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
