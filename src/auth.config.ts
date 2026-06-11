import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Sections soumises au filtrage par permission (1er segment d'URL).
// Doit rester aligné avec lib/permissions.ts (dupliqué ici car ce fichier
// doit rester compatible edge/middleware, sans import lourd).
const GUARDED_SECTIONS = [
  "candidats",
  "crm",
  "clients-pro",
  "formations",
  "sessions",
  "elearning",
  "signatures",
  "automatisations",
  "formateurs",
  "bpf",
  "qualiopi",
  "rgpd",
];
const STAFF_FILTRES: Role[] = ["RESPONSABLE_FORMATION", "ASSISTANT"];

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
      const path = nextUrl.pathname;

      if (path.startsWith("/login")) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true; // page de login accessible aux non-connectés
      }
      if (!isLoggedIn) return false;

      const role = auth!.user.role as Role;
      const permissions = (auth!.user.permissions as string[] | undefined) ?? [];
      const seg = path.split("/")[1] ?? "";

      // Administration (gestion des comptes) : réservée au gérant (ADMIN).
      if (path.startsWith("/administration") && role !== "ADMIN") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Collaborateurs (staff non-admin) : accès limité aux sections cochées.
      if (
        STAFF_FILTRES.includes(role) &&
        GUARDED_SECTIONS.includes(seg) &&
        !permissions.includes(seg)
      ) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
        token.permissions = (user as { permissions?: string[] }).permissions ?? [];
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.permissions = (token.permissions as string[] | undefined) ?? [];
      }
      return session;
    },
  },
  providers: [], // complétés dans auth.ts
} satisfies NextAuthConfig;
