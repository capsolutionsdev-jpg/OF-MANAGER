import { signOut } from "@/auth";

// Déconnexion par simple navigation GET (lien), plutôt qu'une Server Action POST :
// immunisé contre un onglet resté ouvert après un redéploiement/redémarrage
// (un POST d'action serveur périmé échoue avec « This page couldn't load »).
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Motif optionnel (ex. déconnexion forcée car connexion sur un autre appareil)
  // → transmis à la page de login pour afficher un message.
  const reason = new URL(req.url).searchParams.get("reason");
  await signOut({ redirectTo: reason ? `/login?reason=${encodeURIComponent(reason)}` : "/login" });
}
