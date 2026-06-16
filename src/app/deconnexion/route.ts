import { signOut } from "@/auth";

// Déconnexion par simple navigation GET (lien), plutôt qu'une Server Action POST :
// immunisé contre un onglet resté ouvert après un redéploiement/redémarrage
// (un POST d'action serveur périmé échoue avec « This page couldn't load »).
export const dynamic = "force-dynamic";

export async function GET() {
  await signOut({ redirectTo: "/login" });
}
