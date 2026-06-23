import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileCard, PasswordCard, TeamCard } from "@/components/console/superadmin-account";
import { TwoFactorSettings } from "@/components/account/two-factor-settings";

export const dynamic = "force-dynamic";

export default async function ConsoleComptePage() {
  const session = await requireSuperAdmin();
  const currentId = session!.user!.id as string;

  const me = await prisma.user.findUnique({
    where: { id: currentId },
    select: { name: true, email: true, totpEnabled: true },
  });
  const editors = await prisma.user.findMany({
    where: { role: "SUPERADMIN" },
    select: { id: true, name: true, email: true, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Mon compte éditeur"
        subtitle="Gérez votre profil, votre mot de passe et les comptes de l'équipe éditeur."
      />
      <ProfileCard name={me?.name ?? ""} email={me?.email ?? ""} />
      <PasswordCard />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Double authentification (2FA)</CardTitle>
          <CardDescription>
            Seconde vérification à la connexion (TOTP) — vivement recommandée pour
            un compte éditeur (accès à tous les organismes).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactorSettings enabled={me?.totpEnabled ?? false} />
        </CardContent>
      </Card>
      <TeamCard editors={editors} currentId={currentId} />
    </div>
  );
}
