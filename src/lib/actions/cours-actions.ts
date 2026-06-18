"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import {
  coursFormSchema,
  slugify,
  type CoursFormValues,
  type LeconRessource,
  type LeconQuizItem,
  type LeconImage,
} from "@/lib/validators/cours";

type Res = { ok: boolean; error?: string };
type CreateRes = { ok: true; id: string } | { ok: false; error: string };

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const db = await getTenantDb();
  const root = slugify(base) || "cours";
  let slug = root;
  let n = 1;
  while (true) {
    const existing = await db.cours.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

export async function createCours(values: CoursFormValues): Promise<CreateRes> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const parsed = coursFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const v = parsed.data;

  const cours = await db.cours.create({
    data: {
      titre: v.titre.trim(),
      slug: await uniqueSlug(v.titre),
      academy: v.academy,
      formationId: v.formationId && v.formationId !== "" ? v.formationId : null,
      description: v.description?.trim() || null,
      niveau: v.niveau?.trim() || null,
      imageUrl: v.imageUrl?.trim() || null,
      isPublished: !!v.isPublished,
    },
  });
  revalidatePath("/elearning");
  return { ok: true, id: cours.id };
}

export async function updateCours(
  id: string,
  values: CoursFormValues,
): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const parsed = coursFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const v = parsed.data;

  await db.cours.update({
    where: { id },
    data: {
      titre: v.titre.trim(),
      slug: await uniqueSlug(v.titre, id),
      academy: v.academy,
      formationId: v.formationId && v.formationId !== "" ? v.formationId : null,
      description: v.description?.trim() || null,
      niveau: v.niveau?.trim() || null,
      imageUrl: v.imageUrl?.trim() || null,
      isPublished: !!v.isPublished,
    },
  });
  revalidatePath("/elearning");
  revalidatePath(`/elearning/${id}`);
  return { ok: true };
}

export async function togglePublishCours(
  id: string,
  isPublished: boolean,
): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  await db.cours.update({ where: { id }, data: { isPublished } });
  revalidatePath("/elearning");
  revalidatePath(`/elearning/${id}`);
  return { ok: true };
}

export async function deleteCours(id: string): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  await db.cours.delete({ where: { id } });
  revalidatePath("/elearning");
  return { ok: true };
}

// ── Modules ──
export async function addModule(coursId: string, titre: string): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  if (!titre.trim()) return { ok: false, error: "Titre requis." };
  const count = await db.coursModule.count({ where: { coursId } });
  await db.coursModule.create({
    data: { coursId, titre: titre.trim(), ordre: count },
  });
  revalidatePath(`/elearning/${coursId}`);
  return { ok: true };
}

export async function updateModule(
  moduleId: string,
  titre: string,
): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const m = await db.coursModule.update({
    where: { id: moduleId },
    data: { titre: titre.trim() },
    select: { coursId: true },
  });
  revalidatePath(`/elearning/${m.coursId}`);
  return { ok: true };
}

export async function deleteModule(moduleId: string): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const m = await db.coursModule.delete({
    where: { id: moduleId },
    select: { coursId: true },
  });
  revalidatePath(`/elearning/${m.coursId}`);
  return { ok: true };
}

// ── Leçons ──
export async function addLecon(moduleId: string, titre: string): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  if (!titre.trim()) return { ok: false, error: "Titre requis." };
  const count = await db.lecon.count({ where: { moduleId } });
  const m = await db.coursModule.findUnique({
    where: { id: moduleId },
    select: { coursId: true },
  });
  await db.lecon.create({
    data: { moduleId, titre: titre.trim(), ordre: count },
  });
  if (m) revalidatePath(`/elearning/${m.coursId}`);
  return { ok: true };
}

export async function updateLecon(
  leconId: string,
  data: {
    titre?: string;
    contenu?: string;
    videoUrl?: string;
    dureeMin?: number | null;
    images?: LeconImage[];
    ressources?: LeconRessource[];
    quiz?: LeconQuizItem[];
    isPublished?: boolean;
  },
): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const lecon = await db.lecon.update({
    where: { id: leconId },
    data: {
      ...(data.titre !== undefined ? { titre: data.titre.trim() } : {}),
      ...(data.contenu !== undefined ? { contenu: data.contenu || null } : {}),
      ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl.trim() || null } : {}),
      ...(data.dureeMin !== undefined ? { dureeMin: data.dureeMin } : {}),
      ...(data.images !== undefined
        ? { imagesJson: data.images.filter((i) => i.url) }
        : {}),
      ...(data.ressources !== undefined
        ? { ressourcesJson: data.ressources.filter((r) => r.label && r.url) }
        : {}),
      ...(data.quiz !== undefined
        ? {
            quizJson: data.quiz.filter(
              (q) =>
                q.enonce &&
                (q.type === "REDIGEE" || q.options.filter((o) => o.trim()).length >= 2),
            ),
          }
        : {}),
      ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
    },
    select: { module: { select: { coursId: true } } },
  });
  revalidatePath(`/elearning/${lecon.module.coursId}`);
  return { ok: true };
}

export async function deleteLecon(leconId: string): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const lecon = await db.lecon.delete({
    where: { id: leconId },
    select: { module: { select: { coursId: true } } },
  });
  revalidatePath(`/elearning/${lecon.module.coursId}`);
  return { ok: true };
}

// ── Réordonnancement (échange avec le voisin) ──
export async function moveModule(
  moduleId: string,
  dir: "up" | "down",
): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const m = await db.coursModule.findUnique({ where: { id: moduleId } });
  if (!m) return { ok: false, error: "Introuvable." };
  const voisin = await db.coursModule.findFirst({
    where: {
      coursId: m.coursId,
      ordre: dir === "up" ? { lt: m.ordre } : { gt: m.ordre },
    },
    orderBy: { ordre: dir === "up" ? "desc" : "asc" },
  });
  if (!voisin) return { ok: true };
  await db.$transaction([
    db.coursModule.update({ where: { id: m.id }, data: { ordre: voisin.ordre } }),
    db.coursModule.update({ where: { id: voisin.id }, data: { ordre: m.ordre } }),
  ]);
  revalidatePath(`/elearning/${m.coursId}`);
  return { ok: true };
}

export async function moveLecon(
  leconId: string,
  dir: "up" | "down",
): Promise<Res> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const l = await db.lecon.findUnique({
    where: { id: leconId },
    include: { module: { select: { coursId: true } } },
  });
  if (!l) return { ok: false, error: "Introuvable." };
  const voisin = await db.lecon.findFirst({
    where: {
      moduleId: l.moduleId,
      ordre: dir === "up" ? { lt: l.ordre } : { gt: l.ordre },
    },
    orderBy: { ordre: dir === "up" ? "desc" : "asc" },
  });
  if (!voisin) return { ok: true };
  await db.$transaction([
    db.lecon.update({ where: { id: l.id }, data: { ordre: voisin.ordre } }),
    db.lecon.update({ where: { id: voisin.id }, data: { ordre: l.ordre } }),
  ]);
  revalidatePath(`/elearning/${l.module.coursId}`);
  return { ok: true };
}
