import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
// Source UNIQUE de la matrice rôles↔sections (module sans dépendance runtime →
// compatible edge/middleware). Fini la duplication (cf. audit ARC-02).
import { SECTION_ROLES, STAFF_FILTRES } from "@/lib/section-roles";

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

      // Page d'accueil publique (landing OFManager) : accessible à tous.
      if (path === "/") return true;

      if (path.startsWith("/login")) {
        if (isLoggedIn) {
          const dest = (auth!.user.role as Role) === "SUPERADMIN" ? "/console" : "/dashboard";
          return Response.redirect(new URL(dest, nextUrl));
        }
        return true; // page de login accessible aux non-connectés
      }
      if (!isLoggedIn) return false;

      const role = auth!.user.role as Role;
      const permissions = (auth!.user.permissions as string[] | undefined) ?? [];
      const seg = path.split("/")[1] ?? "";

      // SUPERADMIN (éditeur) : accès EXCLUSIF à la console /console.
      if (role === "SUPERADMIN") {
        return path.startsWith("/console")
          ? true
          : Response.redirect(new URL("/console", nextUrl));
      }
      // Les autres rôles n'ont pas accès à la console éditeur.
      if (path.startsWith("/console")) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Administration (gestion des comptes) : réservée au gérant (ADMIN).
      if (path.startsWith("/administration") && role !== "ADMIN") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Sections protégées : on vérifie d'abord que le RÔLE a un périmètre
      // légitime sur la section (bloque notamment FORMATEUR / APPRENANT qui
      // tenteraient un accès par URL directe), puis, pour les collaborateurs
      // staff, que la section figure bien dans leurs permissions cochées.
      const allowedRoles = SECTION_ROLES[seg];
      if (allowedRoles) {
        if (!allowedRoles.includes(role)) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        if (STAFF_FILTRES.includes(role) && !permissions.includes(seg)) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        // Fonctionnalité désactivée pour l'organisme → URL bloquée.
        // (liste vide = tout activé ; sinon la section doit y figurer)
        const fonctionnalites =
          (auth!.user.fonctionnalites as string[] | undefined) ?? [];
        if (fonctionnalites.length > 0 && !fonctionnalites.includes(seg)) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
        token.permissions = (user as { permissions?: string[] }).permissions ?? [];
        token.organismeId = (user as { organismeId?: string | null }).organismeId ?? null;
        token.fonctionnalites = (user as { fonctionnalites?: string[] }).fonctionnalites ?? [];
        token.sid = (user as { sid?: string | null }).sid ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.permissions = (token.permissions as string[] | undefined) ?? [];
        session.user.organismeId = (token.organismeId as string | null | undefined) ?? null;
        session.user.fonctionnalites = (token.fonctionnalites as string[] | undefined) ?? [];
        session.user.sid = (token.sid as string | null | undefined) ?? null;
      }
      return session;
    },
  },
  providers: [], // complétés dans auth.ts
} satisfies NextAuthConfig;
