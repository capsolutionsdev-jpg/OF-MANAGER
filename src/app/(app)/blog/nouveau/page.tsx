import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArticleForm } from "@/components/blog/article-form";

export const metadata = { title: "Nouvel article" };

export default function NouvelArticlePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/blog"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au blog
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nouvel article</h1>
      </div>

      <div className="max-w-3xl">
        <ArticleForm />
      </div>
    </div>
  );
}
