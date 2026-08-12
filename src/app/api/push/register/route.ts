import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Enregistre le jeton d'appareil (push) de l'utilisateur connecté, appelé depuis
// l'app mobile (PushRegistrar). No-op tant que PUSH_ENABLED n'est pas activé.
export async function POST(req: Request) {
  if (process.env.PUSH_ENABLED !== "true") {
    return NextResponse.json({ ok: false, disabled: true });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: { token?: string; platform?: string };
  try {
    body = (await req.json()) as { token?: string; platform?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const token = (body.token ?? "").trim();
  const platform = (body.platform ?? "android").slice(0, 16);
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await prisma.deviceToken.upsert({
    where: { token },
    create: { token, platform, userId: session.user.id },
    update: { userId: session.user.id, platform, lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
