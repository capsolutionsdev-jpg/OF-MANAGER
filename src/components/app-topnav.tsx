"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, Bell, LogOut, UserCog, ShieldCheck, ChevronDown } from "lucide-react";
import type { Role } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavLinks, Brand } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { buildNav, roleLabels } from "@/lib/navigation";
import type { NotificationsData } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type NavUser = {
  name?: string | null;
  email?: string | null;
  role: Role;
  permissions?: string[];
  fonctionnalites?: string[];
};

export function AppTopNav({
  user,
  brand,
  notifications,
}: {
  user: NavUser;
  brand?: { nom: string; logoUrl: string | null };
  notifications?: NotificationsData;
}) {
  const pathname = usePathname();
  const { standalone, groups } = buildNav(user.role, user.permissions ?? [], user.fonctionnalites ?? []);
  const label = user.name || user.email || "Utilisateur";
  const initials = label.slice(0, 2).toUpperCase();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const linkCls = (active: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
      active
        ? "bg-secondary text-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur-md">
      {/* Accent de marque : dégradé couleur principale → secondaire (var --brand-2) */}
      <div
        className="h-[3px] w-full"
        style={{ background: "linear-gradient(90deg, var(--primary), var(--brand-2, var(--primary)))" }}
      />
      <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-3 md:px-5">
        {/* Burger mobile */}
        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="lg:hidden" />}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Ouvrir le menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Brand />
            <NavLinks
              role={user.role}
              permissions={user.permissions ?? []}
              fonctionnalites={user.fonctionnalites ?? []}
            />
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/dashboard" className="flex shrink-0 items-center">
          {brand?.logoUrl ? (
            // Logo personnalisé (data URL en base) — next/image ne gère pas les data: URLs
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.nom} className="h-8 w-auto" />
          ) : (
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              {brand?.nom ?? "CAP Compétences"}
            </span>
          )}
        </Link>

        {/* Navigation (desktop) : liens directs + un menu par catégorie */}
        <nav aria-label="Navigation principale" className="hidden flex-1 items-center gap-0.5 lg:flex">
          {standalone.map((it) => (
            <Link key={it.href} href={it.href} className={linkCls(isActive(it.href))}>
              {it.label}
            </Link>
          ))}
          {groups.map((g) => {
            const groupActive = g.items.some((it) => isActive(it.href));
            return (
              <DropdownMenu key={g.name}>
                <DropdownMenuTrigger render={<button className={linkCls(groupActive)} />}>
                  <span className="inline-flex items-center gap-1">
                    {g.name} <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {g.items.map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={cn(
                        "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted",
                        isActive(it.href) && "bg-muted font-medium",
                      )}
                    >
                      <it.icon className="h-4 w-4 text-muted-foreground" />
                      {it.label}
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>

        {/* Actions à droite */}
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Rechercher">
            <Search className="h-[18px] w-[18px]" />
          </Button>
          {notifications ? (
            <NotificationBell data={notifications} />
          ) : (
            <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Notifications">
              <Bell className="h-[18px] w-[18px]" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" className="flex items-center gap-2 px-1.5" />}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#221F19] text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{label}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {roleLabels[user.role]}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user.role === "ADMIN" ? (
                <Link
                  href="/administration"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Administration
                </Link>
              ) : (
                <Link
                  href="/mon-compte"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <UserCog className="h-4 w-4" />
                  Mon compte
                </Link>
              )}
              <DropdownMenuSeparator />
              <Link
                href="/deconnexion"
                prefetch={false}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Déconnexion visible (1 clic) — navigation GET robuste */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            title="Se déconnecter"
            render={<Link href="/deconnexion" prefetch={false} />}
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
