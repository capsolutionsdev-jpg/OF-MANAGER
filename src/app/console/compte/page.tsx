import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileCard, PasswordCard, TeamCard } from "@/components/console/superadmin-account";

export const dynamic = "force-dynamic";

export default async function ConsoleComptePage() {
  const session = await requireSuperAdmin();
  const currentId = session!.user!.id as string;

  const me = await prisma.user.findUnique({
    where: { id: currentId },
    select: { name: true, email: true },
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
      <TeamCard editors={editors} currentId={currentId} />
    </div>
  );
}
