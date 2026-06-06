import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Config partagée (compatible edge/middleware) — SANS accès base de données.
// Les providers (Credentials + Prisma + bcrypt) sont ajoutés dans auth.ts (runtime Node).
export const authConfig = {
  // Fait confiance au domaine de la requête (app.capacademy.fr) pour construire
  // les URLs de redirection, au lieu de l'URL système Vercel (…vercel.app).
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // Utilisé par le middleware pour autoriser/bloquer l'accès aux routes.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true; // page de login accessible aux non-connectés
      }
      // Toutes les autres routes (protégées par le matcher) exigent une session.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  providers: [], // complétés dans auth.ts
} satisfies NextAuthConfig;
