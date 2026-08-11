"use client";

import Link from "next/link";
import { Menu, Search, Bell, LogOut, UserCog, ShieldCheck } from "lucide-react";
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
import { SidebarNav, SidebarBrand } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { FocusModeToggle } from "@/components/focus-mode-toggle";
import { roleLabels } from "@/lib/navigation";
import type { NotificationsData } from "@/lib/notifications";

type NavUser = {
  name?: string | null;
  email?: string | null;
  role: Role;
  permissions?: string[];
  fonctionnalites?: string[];
};

/** Fine barre du haut du contenu (la navigation vit dans le rail latéral). */
export function AppTopbar({
  user,
  brand,
  notifications,
}: {
  user: NavUser;
  brand?: { nom: string; logoUrl: string | null };
  notifications?: NotificationsData;
}) {
  const label = user.name || user.email || "Utilisateur";
  const initials = label.slice(0, 2).toUpperCase();

  return (
    <header data-app-chrome className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-3 backdrop-blur-sm md:px-5">
      {/* Tiroir de navigation (mobile / tablette) */}
      <Sheet>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Ouvrir le menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBrand brand={brand} />
          <SidebarNav user={user} />
        </SheetContent>
      </Sheet>

      {/* Recherche globale (candidats, sessions, clients pro) → /recherche */}
      <form
        action="/recherche"
        className="hidden items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-muted-foreground focus-within:ring-1 focus-within:ring-primary sm:flex sm:w-72"
      >
        <Search className="h-4 w-4 shrink-0" />
        <input
          name="q"
          type="search"
          placeholder="Rechercher un candidat, une session…"
          className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          aria-label="Rechercher"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground sm:hidden"
          aria-label="Rechercher"
          render={<Link href="/recherche" />}
        >
          <Search className="h-[18px] w-[18px]" />
        </Button>
        <FocusModeToggle />
        <ThemeToggle />
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
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
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

        {/* Déconnexion visible (1 clic) */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden gap-1.5 text-muted-foreground hover:text-destructive sm:inline-flex"
          title="Se déconnecter"
          render={<Link href="/deconnexion" prefetch={false} />}
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span className="hidden lg:inline">Déconnexion</span>
        </Button>
      </div>
    </header>
  );
}
