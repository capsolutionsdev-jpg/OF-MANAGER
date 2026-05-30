"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { navItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = navItems.filter((item) => item.roles.includes(role));

  return (
    <nav className="flex-1 space-y-1 p-3">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex h-16 items-center gap-2 border-b px-4">
      <Image
        src="/cap-competences-logo.png"
        alt="CAP Compétences"
        width={160}
        height={52}
        priority
        className="h-9 w-auto"
      />
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Manager
      </span>
    </div>
  );
}

export function AppSidebar({ role }: { role: Role }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <Brand />
      <NavLinks role={role} />
    </aside>
  );
}

export { NavLinks, Brand };
