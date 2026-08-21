"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Building2, PhoneCall, LifeBuoy, BadgeEuro, Palette,
  FileSignature, ReceiptEuro, BarChart3, ScrollText, Search, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConsoleAccountMenu } from "@/components/console/console-account-menu";

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: number;
  soon?: boolean;
};
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  { title: "Pilotage", items: [
    { href: "/console", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
    { href: "/console/audit", label: "Journal d'audit", icon: ScrollText },
  ] },
  { title: "Commercial", items: [
    { href: "/console/prospects", label: "Prospects", icon: PhoneCall },
    { href: "/console/devis", label: "Devis & contrats", icon: FileSignature },
  ] },
  { title: "Clients", items: [
    { href: "/console/organismes", label: "Organismes", icon: Building2 },
    { href: "#", label: "Facturation", icon: ReceiptEuro, soon: true },
    { href: "/console/analytics", label: "Analytics", icon: BarChart3 },
  ] },
  { title: "Support", items: [
    { href: "/console/support", label: "Support", icon: LifeBuoy },
  ] },
  { title: "Configuration", items: [
    { href: "/console/tarifs", label: "Tarifs", icon: BadgeEuro },
    { href: "/console/designs", label: "Designs", icon: Palette },
  ] },
];

function Brand() {
  return (
    <Link href="/console" className="flex items-center gap-1.5 font-bold">
      <span className="text-foreground">OF</span>
      <span className="text-primary">Manager</span>
      <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Console
      </span>
    </Link>
  );
}

export function ConsoleRail({
  leadsNew = 0,
  supportUnread = 0,
  name,
  email,
}: {
  leadsNew?: number;
  supportUnread?: number;
  name: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const badgeFor = (href: string) =>
    href === "/console/prospects" ? leadsNew : href === "/console/support" ? supportUnread : 0;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/console/organismes?q=${encodeURIComponent(term)}` : "/console/organismes");
    setOpen(false);
  }

  const nav = (
    <nav className="flex flex-col gap-4">
      {GROUPS.map((g) => (
        <div key={g.title} className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {g.title}
          </p>
          {g.items.map((it) => {
            const badge = badgeFor(it.href);
            if (it.soon) {
              return (
                <div
                  key={it.label}
                  className="flex cursor-default items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground/50"
                  title="Bientôt disponible"
                >
                  <it.icon className="h-4 w-4" />
                  <span>{it.label}</span>
                  <span className="ml-auto rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide">
                    Bientôt
                  </span>
                </div>
              );
            }
            const active = isActive(it.href, it.exact);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <it.icon className="h-4 w-4" />
                <span>{it.label}</span>
                {badge > 0 && (
                  <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const search = (
    <form onSubmit={submitSearch} className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un client…"
        aria-label="Recherche globale"
        className="w-full rounded-md border bg-background py-1.5 pl-8 pr-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </form>
  );

  return (
    <>
      {/* Barre supérieure — mobile uniquement */}
      <div className="flex items-center justify-between border-b bg-background/90 px-4 py-2.5 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Brand />
        <ConsoleAccountMenu name={name} email={email} />
      </div>

      {/* Rail fixe — desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Brand />
        </div>
        <div className="px-3 pt-3">{search}</div>
        <div className="flex-1 overflow-y-auto px-2 py-3">{nav}</div>
        <div className="border-t p-3">
          <ConsoleAccountMenu name={name} email={email} />
        </div>
      </aside>

      {/* Tiroir — mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col border-r bg-background shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-3 pt-3">{search}</div>
            <div className="flex-1 overflow-y-auto px-2 py-3">{nav}</div>
          </div>
        </div>
      )}
    </>
  );
}
