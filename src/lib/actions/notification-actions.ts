"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Marque toutes les notifications comme lues (horodate la dernière consultation). */
export async function markNotificationsRead() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  await prisma.user.update({
    where: { id: userId },
    data: { notificationsSeenAt: new Date() },
  });
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
}
