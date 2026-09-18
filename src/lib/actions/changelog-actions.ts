"use server";

import { revalidatePath } from "next/cache";
import { prismaBase } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { type ActionResult, toActionError } from "@/lib/action-result";
import { releaseInputSchema, entryInputSchema } from "@/lib/changelog";

/**
 * Server Actions du changelog (« mises à jour »). Modèle GLOBAL (Release /
 * ReleaseEntry, produit-wide, hors tenant) → client brut `prismaBase`, gardé
 * `requireSuperAdmin`. Recensé dans l'allowlist du garde prisma direct.
 */

const CONSOLE_PATH = "/console/changelog";

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Données invalides.";
}

export async function createRelease(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireSuperAdmin();
  const parsed = releaseInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const r = await prismaBase.release.create({
      data: { version: parsed.data.version, name: parsed.data.name?.trim() || null },
    });
    revalidatePath(CONSOLE_PATH);
    return { ok: true, data: { id: r.id } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateRelease(id: string, input: unknown): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = releaseInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    await prismaBase.release.update({
      where: { id },
      data: { version: parsed.data.version, name: parsed.data.name?.trim() || null },
    });
    revalidatePath(CONSOLE_PATH);
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

/** Publie (releasedAt = maintenant) ou repasse en brouillon (releasedAt = null). */
export async function setReleasePublished(id: string, published: boolean): Promise<ActionResult> {
  await requireSuperAdmin();
  try {
    await prismaBase.release.update({
      where: { id },
      data: { releasedAt: published ? new Date() : null },
    });
    revalidatePath(CONSOLE_PATH);
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteRelease(id: string): Promise<ActionResult> {
  await requireSuperAdmin();
  try {
    await prismaBase.release.delete({ where: { id } });
    revalidatePath(CONSOLE_PATH);
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function addEntry(releaseId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireSuperAdmin();
  const parsed = entryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    // Nouvelle entrée en fin de liste (order = max + 1).
    const last = await prismaBase.releaseEntry.findFirst({
      where: { releaseId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const entry = await prismaBase.releaseEntry.create({
      data: {
        releaseId,
        category: parsed.data.category,
        title: parsed.data.title,
        body: parsed.data.body?.trim() || null,
        audience: parsed.data.audience,
        order: (last?.order ?? -1) + 1,
      },
    });
    revalidatePath(CONSOLE_PATH);
    return { ok: true, data: { id: entry.id } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateEntry(id: string, input: unknown): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = entryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    await prismaBase.releaseEntry.update({
      where: { id },
      data: {
        category: parsed.data.category,
        title: parsed.data.title,
        body: parsed.data.body?.trim() || null,
        audience: parsed.data.audience,
      },
    });
    revalidatePath(CONSOLE_PATH);
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  await requireSuperAdmin();
  try {
    await prismaBase.releaseEntry.delete({ where: { id } });
    revalidatePath(CONSOLE_PATH);
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}
