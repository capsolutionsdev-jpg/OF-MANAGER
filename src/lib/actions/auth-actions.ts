"use server";

import { auth, signOut } from "@/auth";
import { prismaBase } from "@/lib/prisma";

export async function doSignOut() {
  // Révocation serveur (audit SEC-014) : purge activeSessionId si c'est la session
  // active (updateMany conditionnel — n'invalide pas une session plus récente).
  const session = await auth();
  const uid = session?.user?.id;
  const sid = (session?.user as { sid?: string | null } | undefined)?.sid ?? null;
  if (uid && sid) {
    await prismaBase.user
      .updateMany({ where: { id: uid, activeSessionId: sid }, data: { activeSessionId: null } })
      .catch(() => {});
  }
  await signOut({ redirectTo: "/login" });
}
