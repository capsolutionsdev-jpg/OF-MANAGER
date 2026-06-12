"use client";

import Link from "next/link";
import Image from "next/image";
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
import { visibleNavItems, roleLabels } from "@/lib/navigation";
import { doSignOut } from "@/lib/actions/auth-actions";
import { cn } from "@/lib/utils";

type NavUser = {
  name?: string | null;
  email?: string | null;
  role: Role;
  permissions?: string[];
};

// Nombre d'items affichés directement dans la barre ; le reste va dans « Plus ».
const INLINE = 6;

export function AppTopNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const items = visibleNavItems(user.role, user.permissions ?? []);
  const inline = items.slice(0, INLINE);
  const overflow = items.slice(INLINE);
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
            <NavLinks role={user.role} permissions={user.permissions ?? []} />
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/dashboard" className="flex shrink-0 items-center">
          <Image
            src="/cap-competences-logo.png"
            alt="CAP Compétences"
            width={150}
            height={48}
            priority
            className="h-8 w-auto"
          />
        </Link>

        {/* Navigation inline (desktop) */}
        <nav className="hidden flex-1 items-center gap-0.5 lg:flex">
          {inline.map((it) => (
            <Link key={it.href} href={it.href} className={linkCls(isActive(it.href))}>
              {it.label}
            </Link>
          ))}
          {overflow.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    className={linkCls(overflow.some((it) => isActive(it.href)))}
                  />
                }
              >
                <span className="inline-flex items-center gap-1">
                  Plus <ChevronDown className="h-3.5 w-3.5" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {overflow.map((it) => (
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
          )}
        </nav>

        {/* Actions à droite */}
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Rechercher">
            <Search className="h-[18px] w-[18px]" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Notifications">
            <Bell className="h-[18px] w-[18px]" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" className="flex items-center gap-2 px-1.5" />}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#0e1c3f] text-xs font-semibold text-white">
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
              <form action={doSignOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
