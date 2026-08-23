import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { requires2faEnrollment, ADMIN_2FA_ENFORCED } from "@/lib/security/mandatory-2fa";
import { ConsoleRail } from "@/components/console/console-rail";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();

  // 2FA OBLIGATOIRE pour l'éditeur (§11) : compte le plus privilégié de la
  // plateforme (accès à tous les tenants). Tant qu'elle n'est pas active, on
  // force l'enrôlement (page /securite-2fa, hors confinement /console).
  const me = await prisma.user.findUnique({
    where: { id: session!.user!.id as string },
    select: { totpEnabled: true },
  });
  if (ADMIN_2FA_ENFORCED && me && requires2faEnrollment("SUPERADMIN", me.totpEnabled))
    redirect("/securite-2fa");
  const [supportUnread, leadsNew] = await Promise.all([
    prisma.supportTicket.count({ where: { nonLuSupport: true } }),
    prisma.lead.count({ where: { lu: false } }),
  ]);

  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      <ConsoleRail
        leadsNew={leadsNew}
        supportUnread={supportUnread}
        name={session!.user!.name ?? ""}
        email={session!.user!.email ?? ""}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1200px] p-4 md:p-6">
          {/* useConfirm() est utilisé par la liste des prospects et les tâches
              de la fiche — le provider doit envelopper tout l'arbre /console. */}
          <ConfirmProvider>{children}</ConfirmProvider>
        </div>
      </main>
    </div>
  );
}
