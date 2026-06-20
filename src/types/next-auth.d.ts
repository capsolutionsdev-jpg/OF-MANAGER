import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

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
  }
}
