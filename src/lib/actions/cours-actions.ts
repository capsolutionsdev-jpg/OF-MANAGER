"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  coursFormSchema,
  slugify,
  type CoursFormValues,
  type LeconRessource,
  type LeconQuizItem,
} from "@/lib/validators/cours";

type Res = { ok: boolean; error?: string };
type CreateRes = { ok: true; id: string } | { ok: false; error: string };

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "cours";
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.cours.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

export async function createCours(values: CoursFormValues): Promise<CreateRes> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const parsed = coursFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const v = parsed.data;

  const cours = await prisma.cours.create({
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
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const parsed = coursFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const v = parsed.data;

  await prisma.cours.update({
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
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  await prisma.cours.update({ where: { id }, data: { isPublished } });
  revalidatePath("/elearning");
  revalidatePath(`/elearning/${id}`);
  return { ok: true };
}

export async function deleteCours(id: string): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  await prisma.cours.delete({ where: { id } });
  revalidatePath("/elearning");
  return { ok: true };
}

// ── Modules ──
export async function addModule(coursId: string, titre: string): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  if (!titre.trim()) return { ok: false, error: "Titre requis." };
  const count = await prisma.coursModule.count({ where: { coursId } });
  await prisma.coursModule.create({
    data: { coursId, titre: titre.trim(), ordre: count },
  });
  revalidatePath(`/elearning/${coursId}`);
  return { ok: true };
}

export async function updateModule(
  moduleId: string,
  titre: string,
): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const m = await prisma.coursModule.update({
    where: { id: moduleId },
    data: { titre: titre.trim() },
    select: { coursId: true },
  });
  revalidatePath(`/elearning/${m.coursId}`);
  return { ok: true };
}

export async function deleteModule(moduleId: string): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const m = await prisma.coursModule.delete({
    where: { id: moduleId },
    select: { coursId: true },
  });
  revalidatePath(`/elearning/${m.coursId}`);
  return { ok: true };
}

// ── Leçons ──
export async function addLecon(moduleId: string, titre: string): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  if (!titre.trim()) return { ok: false, error: "Titre requis." };
  const count = await prisma.lecon.count({ where: { moduleId } });
  const m = await prisma.coursModule.findUnique({
    where: { id: moduleId },
    select: { coursId: true },
  });
  await prisma.lecon.create({
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
    ressources?: LeconRessource[];
    quiz?: LeconQuizItem[];
    isPublished?: boolean;
  },
): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const lecon = await prisma.lecon.update({
    where: { id: leconId },
    data: {
      ...(data.titre !== undefined ? { titre: data.titre.trim() } : {}),
      ...(data.contenu !== undefined ? { contenu: data.contenu || null } : {}),
      ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl.trim() || null } : {}),
      ...(data.dureeMin !== undefined ? { dureeMin: data.dureeMin } : {}),
      ...(data.ressources !== undefined
        ? { ressourcesJson: data.ressources.filter((r) => r.label && r.url) }
        : {}),
      ...(data.quiz !== undefined
        ? { quizJson: data.quiz.filter((q) => q.enonce && q.options.length >= 2) }
        : {}),
      ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
    },
    select: { module: { select: { coursId: true } } },
  });
  revalidatePath(`/elearning/${lecon.module.coursId}`);
  return { ok: true };
}

export async function deleteLecon(leconId: string): Promise<Res> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const lecon = await prisma.lecon.delete({
    where: { id: leconId },
    select: { module: { select: { coursId: true } } },
  });
  revalidatePath(`/elearning/${lecon.module.coursId}`);
  return { ok: true };
}
