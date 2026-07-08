import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/org";
import { WelcomeForm } from "./welcome-form";

export const dynamic = "force-dynamic";

/**
 * Première connexion — changement OBLIGATOIRE du mot de passe provisoire (compte
 * candidat). Hors du groupe (app) pour ne pas déclencher la garde du layout
 * (évite toute boucle de redirection). Si le mot de passe a déjà été changé,
 * on renvoie l'utilisateur vers son espace.
 */
export default async function BienvenuePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true, name: true },
  });
  if (!user?.mustChangePassword) redirect("/");

  const branding = await getBranding();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="text-center">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={branding.nom} className="mx-auto mb-3 h-12 w-auto object-contain" />
          ) : null}
          <h1 className="text-xl font-bold">Bienvenue {user.name ? user.name.split(" ")[0] : ""} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pour sécuriser votre espace, choisissez votre propre mot de passe avant de continuer.
          </p>
        </div>
        <WelcomeForm />
        <p className="text-center text-xs text-muted-foreground">
          {branding.nom}
        </p>
      </div>
    </main>
  );
}
