import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
// Source UNIQUE de la matrice rôles↔sections (module sans dépendance runtime →
// compatible edge/middleware). Fini la duplication (cf. audit ARC-02).
import { SECTION_ROLES, STAFF_FILTRES } from "@/lib/section-roles";
import { isEntrepriseAllowedPath } from "@/lib/entreprise-routes";
import {
  applyImpersonationStart,
  applyImpersonationStop,
  type ImpUpdatePayload,
  type ImpTokenLike,
  type ImpClaim,
} from "@/lib/impersonation";

// Config partagée (compatible edge/middleware) — SANS accès base de données.
// Les providers (Credentials + Prisma + bcrypt) sont ajoutés dans auth.ts (runtime Node).
export const authConfig = {
  // Fait confiance au domaine de la requête (app.capacademy.fr) pour construire
  // les URLs de redirection, au lieu de l'URL système Vercel (…vercel.app).
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  // Session JWT : expiration ABSOLUE de 12 h, rafraîchie sur activité (updateAge
  // 1 h) → approxime une expiration sur INACTIVITÉ (déconnexion après ~12 h sans
  // navigation). Réduit la fenêtre d'exploitation d'un token volé (§13).
  session: { strategy: "jwt", maxAge: 12 * 60 * 60, updateAge: 60 * 60 },
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

      // Espace CANDIDAT : l'apprenant est confiné à son propre espace (jamais le
      // tableau de bord ni les pages staff). Toute autre URL → /mon-espace.
      if (role === "APPRENANT") {
        const extras = ["/bienvenue", "/catalogue", "/messagerie", "/historique"];
        const ok =
          path.startsWith("/mes-") ||
          path.startsWith("/mon-") ||
          extras.some((p) => path === p || path.startsWith(`${p}/`));
        return ok ? true : Response.redirect(new URL("/mon-espace", nextUrl));
      }

      // Espace FORMATEUR : confiné à ses propres pages (ses sessions, sa
      // facturation, ses contrats, l'e-learning qu'il anime). JAMAIS le tableau
      // de bord ni les pages staff. Toute autre URL → /mes-sessions.
      if (role === "FORMATEUR") {
        const extras = ["/bienvenue", "/elearning", "/compte-rendu"];
        const ok =
          path.startsWith("/mes-") ||
          path.startsWith("/mon-") ||
          path.startsWith("/ma-") ||
          extras.some((p) => path === p || path.startsWith(`${p}/`));
        return ok ? true : Response.redirect(new URL("/mes-sessions", nextUrl));
      }

      // Espace ENTREPRISE (client professionnel) : confiné à /espace-entreprise/*,
      // jamais le back-office ni un autre espace. Toute autre URL → /espace-entreprise.
      if (role === "ENTREPRISE") {
        return isEntrepriseAllowedPath(path)
          ? true
          : Response.redirect(new URL("/espace-entreprise", nextUrl));
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
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
        token.permissions = (user as { permissions?: string[] }).permissions ?? [];
        token.organismeId = (user as { organismeId?: string | null }).organismeId ?? null;
        token.fonctionnalites = (user as { fonctionnalites?: string[] }).fonctionnalites ?? [];
        token.sid = (user as { sid?: string | null }).sid ?? null;
      } else if (trigger === "update" && session && typeof session === "object" && "imp" in session) {
        // Bascule « mode support » (impersonation). Ne touche JAMAIS le chemin de
        // login (branche `if (user)`) : uniquement le trigger `update` explicite.
        const payload = session as ImpUpdatePayload;
        // Le JWT est muté EN PLACE (même référence) via ce cast typé.
        const tok = token as unknown as ImpTokenLike;
        if (payload.imp === null) {
          // Sortie du mode support : no-op si aucune impersonation en cours
          // (un token normal n'a pas de claim `imp`).
          applyImpersonationStop(tok);
        } else if (tok.role === "SUPERADMIN") {
          // SÉCURITÉ (audit SEC-79) : SEUL un SUPERADMIN peut DÉMARRER une
          // impersonation. Le trigger `update` de NextAuth est joignable via
          // POST /api/auth/session (hors matcher middleware) par TOUT compte
          // connecté ; sans cette garde, un rôle quelconque pourrait poser
          // `imp:{orgId}` et devenir ADMIN d'un organisme arbitraire (escalade
          // inter-tenant). La garde de la server action `startImpersonation`
          // ne suffit pas : ce chemin direct ne l'emprunte pas.
          applyImpersonationStart(tok, payload.imp);
        }
        // else : rôle non-SUPERADMIN → charge `imp` ignorée, token inchangé.
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
        const imp = token.imp as ImpClaim | null | undefined;
        session.user.imp = imp ? { orgId: imp.orgId, orgNom: imp.orgNom } : null;
      }
      return session;
    },
  },
  providers: [], // complétés dans auth.ts
} satisfies NextAuthConfig;
