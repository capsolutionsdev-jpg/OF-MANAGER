"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, VitrineStatut } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { articleFormSchema, type ArticleFormValues } from "@/lib/validators/article";

// =============================================================
//  ACTIONS BLOG — articles du site vitrine (capacademy.fr).
//  Les articles PUBLIEE sont exposés par /api/public/blog et lus par
//  le vitrine (surcouche par slug). Changements en ligne sous ~5 min.
// =============================================================

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const clean = (s?: string | null) => (s && s.trim() !== "" ? s.trim() : null);

function toData(v: ArticleFormValues) {
  // Date de publication : AAAA-MM-JJ → Date ; vide/invalide = maintenant.
  const d = v.datePublication ? new Date(v.datePublication) : null;
  const datePublication = d && !Number.isNaN(d.getTime()) ? d : new Date();

  return {
    titre: v.titre.trim(),
    slug: v.slug.trim(),
    extrait: clean(v.extrait),
    contenu: clean(v.contenu),
    auteur: clean(v.auteur),
    categorie: clean(v.categorie),
    imageUrl: clean(v.imageUrl),
    imageAlt: clean(v.imageAlt),
    datePublication,
    statut: v.statut ?? VitrineStatut.MASQUEE,
  };
}

export async function createArticle(
  values: ArticleFormValues,
): Promise<ActionResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = articleFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  try {
    const article = await db.article.create({ data: toData(parsed.data) });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Article",
        entityId: article.id,
      },
    });
    revalidatePath("/blog");
    return { ok: true, id: article.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ce slug est déjà utilisé par un autre article." };
    }
    throw e;
  }
}

export async function updateArticle(
  id: string,
  values: ArticleFormValues,
): Promise<ActionResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = articleFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  try {
    await db.article.update({ where: { id }, data: toData(parsed.data) });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Article",
        entityId: id,
      },
    });
    revalidatePath("/blog");
    revalidatePath(`/blog/${id}`);
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ce slug est déjà utilisé par un autre article." };
    }
    throw e;
  }
}

// --- Actions déclenchées par des boutons (formulaires serveur) ---

/** Bascule rapide du statut de publication depuis la liste. */
export async function setArticleStatutAction(formData: FormData) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id"));
  const statutRaw = String(formData.get("statut") ?? "");
  if (!id || !(Object.values(VitrineStatut) as string[]).includes(statutRaw)) {
    return;
  }

  await db.article.update({
    where: { id },
    data: { statut: statutRaw as VitrineStatut },
  });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "VITRINE_STATUT",
      entityType: "Article",
      entityId: id,
    },
  });
  revalidatePath("/blog");
  revalidatePath(`/blog/${id}`);
}

/** Archive (retire de la liste) un article. */
export async function archiveArticleAction(formData: FormData) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id"));
  if (!id) return;

  await db.article.update({ where: { id }, data: { isArchived: true } });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "ARCHIVE",
      entityType: "Article",
      entityId: id,
    },
  });
  revalidatePath("/blog");
  redirect("/blog");
}
