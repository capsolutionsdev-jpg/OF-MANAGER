import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { ConsoleRail } from "@/components/console/console-rail";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();
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
        <div className="mx-auto max-w-[1200px] p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
