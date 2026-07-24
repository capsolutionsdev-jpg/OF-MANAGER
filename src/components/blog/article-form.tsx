"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save, Wand2 } from "lucide-react";

import {
  articleFormSchema,
  type ArticleFormValues,
  ARTICLE_STATUT_LABELS,
  slugify,
} from "@/lib/validators/article";
import { createArticle, updateArticle } from "@/lib/actions/article-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-sm text-destructive">{msg}</p>;
}

export function ArticleForm({
  articleId,
  defaultValues,
}: {
  articleId?: string;
  defaultValues?: Partial<ArticleFormValues>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      titre: "",
      slug: "",
      extrait: "",
      contenu: "",
      auteur: "L'équipe CAP Compétences",
      categorie: "",
      imageUrl: "",
      imageAlt: "",
      datePublication: new Date().toISOString().slice(0, 10),
      statut: "MASQUEE",
      ...defaultValues,
    },
  });

  // Pré-remplit le slug depuis le titre tant qu'il n'a pas été édité manuellement.
  const [slugTouched, setSlugTouched] = useState(!!defaultValues?.slug);

  function onSubmit(values: ArticleFormValues) {
    startTransition(async () => {
      const res = articleId
        ? await updateArticle(articleId, values)
        : await createArticle(values);

      if (res.ok) {
        toast.success(articleId ? "Article mis à jour." : "Article créé.");
        router.push("/blog");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Article</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input
              id="titre"
              {...register("titre", {
                onChange: (e) => {
                  if (!slugTouched) {
                    setValue("slug", slugify(e.target.value), {
                      shouldValidate: true,
                    });
                  }
                },
              })}
            />
            <ErrorText msg={errors.titre?.message} />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="slug">
              Slug * <span className="text-muted-foreground">(URL : /blog/mon-slug)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="slug"
                placeholder="mon-article"
                {...register("slug", { onChange: () => setSlugTouched(true) })}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSlugTouched(true);
                  setValue("slug", slugify(getValues("titre")), {
                    shouldValidate: true,
                  });
                }}
                title="Générer depuis le titre"
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
            <ErrorText msg={errors.slug?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="categorie">Catégorie</Label>
            <Input
              id="categorie"
              placeholder="Financement, Sécurité…"
              {...register("categorie")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="auteur">Auteur</Label>
            <Input id="auteur" {...register("auteur")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="datePublication">Date de publication</Label>
            <Input id="datePublication" type="date" {...register("datePublication")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="statut">Statut</Label>
            <select id="statut" className={selectClass} {...register("statut")}>
              {Object.entries(ARTICLE_STATUT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="extrait">Extrait (résumé court)</Label>
            <Textarea
              id="extrait"
              rows={2}
              placeholder="Résumé affiché dans la liste et la meta description."
              {...register("extrait")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="imageUrl">Image (URL)</Label>
            <Input id="imageUrl" placeholder="https://…" {...register("imageUrl")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="imageAlt">Texte alternatif de l&apos;image</Label>
            <Input id="imageAlt" {...register("imageAlt")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="contenu">Corps de l&apos;article</Label>
            <Textarea
              id="contenu"
              rows={16}
              className="font-mono text-sm"
              placeholder={
                "Écrivez en markdown léger :\n\n## Un sous-titre\n\nUn paragraphe normal.\n\n- une puce\n- une autre puce"
              }
              {...register("contenu")}
            />
            <p className="text-xs text-muted-foreground">
              Mise en forme : <code>## Titre</code> pour un sous-titre,{" "}
              <code>- texte</code> pour une puce, une ligne vide sépare les
              paragraphes.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending
            ? "Enregistrement…"
            : articleId
              ? "Mettre à jour"
              : "Créer l'article"}
        </Button>
      </div>
    </form>
  );
}
