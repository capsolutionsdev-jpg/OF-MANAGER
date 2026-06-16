import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { ConsoleNav } from "@/components/console/console-nav";
import { ConsoleAccountMenu } from "@/components/console/console-account-menu";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();
  const supportUnread = await prisma.supportTicket.count({ where: { nonLuSupport: true } });

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-2.5">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-foreground">OF</span>
            <span className="text-primary">Manager</span>
            <span className="ml-1 hidden text-xs font-medium text-muted-foreground sm:inline">
              · Console éditeur
            </span>
          </div>
          <div className="ml-2">
            <ConsoleNav supportUnread={supportUnread} />
          </div>
          <div className="ml-auto">
            <ConsoleAccountMenu
              name={session!.user!.name ?? ""}
              email={session!.user!.email ?? ""}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] p-4 md:p-6">{children}</main>
    </div>
  );
}
