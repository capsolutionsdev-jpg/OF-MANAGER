import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    permissions?: string[];
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      permissions: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    permissions: string[];
  }
}
