import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import type { ImpClaim } from "@/lib/impersonation";

declare module "next-auth" {
  interface User {
    role: Role;
    permissions?: string[];
    organismeId?: string | null;
    fonctionnalites?: string[];
    sid?: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      permissions: string[];
      organismeId: string | null;
      fonctionnalites: string[];
      sid: string | null;
      // Mode support : présent (≠ null) tant qu'un SUPERADMIN impersonne un OF.
      imp?: { orgId: string; orgNom: string } | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    permissions: string[];
    organismeId: string | null;
    fonctionnalites: string[];
    sid: string | null;
    // Claim d'impersonation : identité réelle mémorisée + org ciblée (cf. lib/impersonation).
    imp?: ImpClaim | null;
  }
}
