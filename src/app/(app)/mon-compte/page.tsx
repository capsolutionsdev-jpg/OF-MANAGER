import { redirect } from "next/navigation";
import { ShieldCheck, KeyRound } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "./change-password-form";
import { TwoFactorSettings } from "@/components/account/two-factor-settings";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function MonComptePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpEnabled: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Mon compte" subtitle="Gérez vos informations de connexion et votre sécurité." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-muted-foreground">Nom</div>
            <div className="font-medium">{user.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">E-mail</div>
            <div className="font-medium">{user.email}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Rôle</div>
            <div className="font-medium">{roleLabels[user.role]}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Changer mon mot de passe
          </CardTitle>
          <CardDescription>
            Choisissez un mot de passe fort (8 caractères minimum, avec lettres
            et chiffres).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            Double authentification (2FA)
          </CardTitle>
          <CardDescription>
            Ajoutez une seconde vérification à la connexion via une application
            d&apos;authentification (TOTP). Fortement recommandé pour les comptes à
            privilèges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactorSettings enabled={dbUser?.totpEnabled ?? false} />
        </CardContent>
      </Card>
    </div>
  );
}
