import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { checkLimit, clientIp } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Fenêtre anti-brute-force / credential-stuffing. Limiteur en mémoire (par
// instance) : protection de base ; pour une limite partagée et robuste en
// serverless, brancher Upstash Ratelimit (Redis) — cf. lib/rate-limit.ts.
const LOGIN_WINDOW_MS = 5 * 60_000;
const MAX_PER_EMAIL = 8; // tentatives par compte ciblé / 5 min
const MAX_PER_IP = 20; // tentatives par IP (toutes adresses confondues) / 5 min

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Anti-brute-force : on plafonne les tentatives par compte ET par IP.
        const ip = request instanceof Request ? clientIp(request) : "unknown";
        const [byEmail, byIp] = await Promise.all([
          checkLimit(`login-id:${email.toLowerCase()}`, { limit: MAX_PER_EMAIL, windowMs: LOGIN_WINDOW_MS }),
          checkLimit(`login-ip:${ip}`, { limit: MAX_PER_IP, windowMs: LOGIN_WINDOW_MS }),
        ]);
        if (!byEmail.ok || !byIp.ok) {
          // Trop de tentatives → on refuse sans révéler la cause (anti-énumération).
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { organisme: { select: { fonctionnalites: true } } },
        });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Session unique : on enregistre l'identifiant de CETTE connexion sur le
        // compte. Toute connexion ultérieure (autre appareil) le remplacera, ce
        // qui déconnecte l'appareil précédent à sa prochaine navigation.
        const sid = randomUUID();
        await prisma.user.update({ where: { id: user.id }, data: { activeSessionId: sid } });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions ?? [],
          organismeId: user.organismeId ?? null,
          fonctionnalites: user.organisme?.fonctionnalites ?? [],
          sid,
        };
      },
    }),
  ],
});
