"use client";

import { Menu, LogOut } from "lucide-react";
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
};

export function AppHeader({ user }: { user: HeaderUser }) {
  const label = user.name || user.email || "Utilisateur";
  const initials = label.slice(0, 2).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
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
            <NavLinks role={user.role} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-medium text-muted-foreground">
          {roleLabels[user.role]}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="flex items-center gap-2 px-2" />
          }
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm sm:inline">{label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="font-medium">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </DropdownMenuLabel>
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
