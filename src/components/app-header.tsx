"use client";

import Link from "next/link";
import { Menu, LogOut, UserCog, ShieldCheck } from "lucide-react";
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
import { roleLabels } from "@/lib/navigation";
import { doSignOut } from "@/lib/actions/auth-actions";

type HeaderUser = {
  name?: string | null;
  email?: string | null;
  role: Role;
  permissions?: string[];
};

export function AppHeader({ user }: { user: HeaderUser }) {
  const label = user.name || user.email || "Utilisateur";
  const initials = label.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="md:hidden" />}
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
        {user.role === "ADMIN" ? (
          <Link
            href="/administration"
            title="Administration"
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {roleLabels[user.role]}
          </Link>
        ) : (
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {roleLabels[user.role]}
          </span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="flex items-center gap-2 px-2" />
          }
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#221F19] text-xs font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm sm:inline">{label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="font-medium">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
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
    </header>
  );
}
