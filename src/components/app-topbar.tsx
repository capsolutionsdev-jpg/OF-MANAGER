"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Search, Bell, LogOut, UserCog, ShieldCheck, PanelLeft } from "lucide-react";
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
import { useRail } from "@/components/rail-context";
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
  // Tiroir de nav contrôlé → se referme après un tap sur une entrée (sinon il
  // reste ouvert par-dessus la nouvelle page sur mobile).
  const [menuOpen, setMenuOpen] = useState(false);
  const { toggle } = useRail();

  return (
    <header
      data-app-chrome
      data-app-topbar
      className="sticky top-0 z-30 flex min-h-16 items-center gap-4 border-b border-border bg-background px-4 pt-[env(safe-area-inset-top)] md:px-6"
    >
      {/* Tiroir de navigation (mobile / tablette) */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Ouvrir le menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBrand brand={brand} />
          <SidebarNav user={user} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Repli du rail (desktop) — une fois replié, le menu se déploie au survol. */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="hidden text-muted-foreground lg:inline-flex"
        aria-label="Replier ou déplier le menu"
        title="Replier / déplier le menu (survol pour l'afficher)"
      >
        <PanelLeft className="h-[18px] w-[18px]" />
      </Button>

      {/* Recherche globale CENTRÉE (candidats, sessions, clients pro) → /recherche */}
      <form
        action="/recherche"
        className="hidden items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-muted-foreground focus-within:ring-2 focus-within:ring-primary/50 sm:flex sm:flex-1 sm:max-w-md lg:mx-auto"
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

      <div className="ml-auto flex items-center gap-2">
        {/* Loup mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground sm:hidden"
          aria-label="Rechercher"
          render={<Link href="/recherche" />}
        >
          <Search className="h-[18px] w-[18px]" />
        </Button>

        {/* Séparateur visuel (optionnel, améliore la lisibilité) */}
        <div className="hidden h-5 w-px bg-border sm:block" />

        {/* Icônes d'action (focus mode, thème, notifications) */}
        <FocusModeToggle />
        <ThemeToggle />
        {notifications ? (
          <NotificationBell data={notifications} />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
          </Button>
        )}

        {/* Avatar + Menu utilisateur (dropdown) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="flex items-center gap-2 px-1.5" />}
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline max-w-32 truncate">{label}</span>
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
      </div>
    </header>
  );
}
