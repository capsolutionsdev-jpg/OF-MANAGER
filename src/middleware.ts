import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Le middleware utilise UNIQUEMENT authConfig (pas de Prisma/bcrypt → compatible edge).
export default NextAuth(authConfig).auth;

export const config = {
  // Protège tout sauf : routes d'API auth, assets Next, fichiers statiques,
  // la page de login et le formulaire d'inscription public.
  matcher: [
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|login|inscription|parcours|signer|satisfaction|compte-rendu|emarger|.*\\..*).*)",
  ],
};
