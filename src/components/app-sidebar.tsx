"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { visibleNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type Tone = "light" | "dark";

function NavLinks({
  role,
  permissions = [],
  fonctionnalites = [],
  onNavigate,
  tone = "light",
}: {
  role: Role;
  permissions?: string[];
  fonctionnalites?: string[];
  onNavigate?: () => void;
  tone?: Tone;
}) {
  const pathname = usePathname();
  const items = visibleNavItems(role, permissions, fonctionnalites);
  const dark = tone === "dark";

  return (
    <nav aria-label="Navigation mobile" className="flex-1 space-y-1 overflow-y-auto p-3">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group/nav flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:translate-x-0.5",
              dark
                ? active
                  ? "bg-white text-[#221F19] shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
                : active
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <item.icon
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200 group-hover/nav:scale-110",
                dark && !active && "text-white/60 group-hover/nav:text-white",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ tone = "light" }: { tone?: Tone }) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "flex h-16 items-center gap-2 border-b px-4",
        dark && "border-white/10",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center rounded-lg",
          dark && "bg-white px-2 py-1 shadow-sm",
        )}
      >
        <Image
          src="/cap-competences-logo.png"
          alt="CAP Compétences"
          width={160}
          height={52}
          priority
          className="h-8 w-auto"
        />
      </span>
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          dark ? "bg-white/10 text-white/80" : "bg-muted text-muted-foreground",
        )}
      >
        Manager
      </span>
    </div>
  );
}

export function AppSidebar({
  role,
  permissions = [],
  fonctionnalites = [],
}: {
  role: Role;
  permissions?: string[];
  fonctionnalites?: string[];
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <Brand tone="light" />
      <NavLinks role={role} permissions={permissions} fonctionnalites={fonctionnalites} tone="light" />
      <div className="border-t border-sidebar-border p-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          CAP Compétences — Manager
        </p>
      </div>
    </aside>
  );
}

export { NavLinks, Brand };
