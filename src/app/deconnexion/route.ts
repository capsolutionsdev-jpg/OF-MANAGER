import { auth, signOut } from "@/auth";
import { prismaBase } from "@/lib/prisma";

// Déconnexion par simple navigation GET (lien), plutôt qu'une Server Action POST :
// immunisé contre un onglet resté ouvert après un redéploiement/redémarrage
// (un POST d'action serveur périmé échoue avec « This page couldn't load »).
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Motif optionnel (ex. déconnexion forcée car connexion sur un autre appareil)
  // → transmis à la page de login pour afficher un message.
  const reason = new URL(req.url).searchParams.get("reason");
  // Révocation serveur (audit SEC-014) : purge activeSessionId UNIQUEMENT si CETTE
  // session est l'active (updateMany conditionnel) → un JWT capturé avant la
  // déconnexion cesse d'être reconnu, sans invalider une nouvelle session légitime.
  const session = await auth();
  const uid = session?.user?.id;
  const sid = (session?.user as { sid?: string | null } | undefined)?.sid ?? null;
  if (uid && sid) {
    await prismaBase.user
      .updateMany({ where: { id: uid, activeSessionId: sid }, data: { activeSessionId: null } })
      .catch(() => {});
  }
  await signOut({ redirectTo: reason ? `/login?reason=${encodeURIComponent(reason)}` : "/login" });
}
