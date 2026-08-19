import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requires2faEnrollment } from "@/lib/security/mandatory-2fa";
import { TwoFactorSettings } from "@/components/account/two-factor-settings";

// Lit la session + la base → jamais pré-généré. Page HORS des groupes (app)/
// console (exclue aussi du matcher middleware) : elle ne subit pas la garde 2FA
// des layouts, ce qui évite toute boucle de redirection.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sécurisez votre compte" };

/**
 * Écran d'enrôlement 2FA OBLIGATOIRE (§11). Les layouts (app)/console y
 * redirigent tout ADMIN/SUPERADMIN qui n'a pas encore activé la double
 * authentification. Une fois la 2FA confirmée, le composant recharge la page :
 * la garde ci-dessous voit `totpEnabled = true` et renvoie l'utilisateur chez lui.
 */
export default async function Securite2faPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpEnabled: true, role: true },
  });
  // Rôle non concerné OU 2FA déjà active → rien à faire ici : retour à l'accueil.
  if (!account || !requires2faEnrollment(account.role, account.totpEnabled)) {
    redirect(account?.role === "SUPERADMIN" ? "/console" : "/dashboard");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 p-6">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-center text-xl font-bold">Sécurisez votre compte</h1>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
          Votre rôle donne accès à des données sensibles. La double
          authentification est <strong>obligatoire</strong> : activez-la pour
          continuer. Munissez-vous d&apos;une application d&apos;authentification
          (Google Authenticator, Authy, 1Password…).
        </p>
        <div className="mt-6 rounded-lg border bg-muted/30 p-4">
          <TwoFactorSettings enabled={false} />
        </div>
        <div className="mt-6 text-center">
          <a
            href="/deconnexion"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Se déconnecter
          </a>
        </div>
      </div>
    </div>
  );
}
