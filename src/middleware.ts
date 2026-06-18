import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Le middleware utilise UNIQUEMENT authConfig (pas de Prisma/bcrypt → compatible edge).
export default NextAuth(authConfig).auth;

export const config = {
  // Protège tout sauf : routes d'API auth, assets Next, fichiers statiques,
  // la page de login et le formulaire d'inscription public.
  matcher: [
    "/((?!api/auth|api/cron|api/pdf-test|api/lead|api/public|_next/static|_next/image|favicon.ico|login|inscription|tarifs|demo|contact|solutions|partenaires|prospect|parcours|signer|satisfaction-entreprise|satisfaction|positionnement|reclamer|compte-rendu|contrat-formateur|emarger|devis-accept|portail/|deconnexion|.*\\..*).*)",
  ],
};
