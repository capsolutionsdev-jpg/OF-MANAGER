import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Archive } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { ArticleForm } from "@/components/blog/article-form";
import { archiveArticleAction } from "@/lib/actions/article-actions";

export default async function ModifierArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await getTenantDb();
  const { id } = await params;
  const a = await db.article.findUnique({ where: { id } });
  if (!a || a.isArchived) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/blog"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Retour au blog
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Modifier — {a.titre}
          </h1>
        </div>
        <form action={archiveArticleAction}>
          <input type="hidden" name="id" value={a.id} />
          <Button type="submit" variant="outline">
            <Archive className="mr-2 h-4 w-4" /> Archiver
          </Button>
        </form>
      </div>

      <div className="max-w-3xl">
        <ArticleForm
          articleId={a.id}
          defaultValues={{
            titre: a.titre,
            slug: a.slug,
            extrait: a.extrait ?? "",
            contenu: a.contenu ?? "",
            auteur: a.auteur ?? "",
            categorie: a.categorie ?? "",
            imageUrl: a.imageUrl ?? "",
            imageAlt: a.imageAlt ?? "",
            datePublication: a.datePublication.toISOString().slice(0, 10),
            statut: a.statut,
          }}
        />
      </div>
    </div>
  );
}
