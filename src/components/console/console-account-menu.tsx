"use client";

import Link from "next/link";
import { UserCog, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ConsoleAccountMenu({ name, email }: { name: string; email: string }) {
  const initials = (name || email || "OF").slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="flex items-center gap-2 px-1.5" />}>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-[#221F19] text-xs font-semibold text-white">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium sm:inline">{name || email}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{email}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-primary">Compte éditeur · SUPERADMIN</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/console/compte" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted">
          <UserCog className="h-4 w-4" /> Mon compte
        </Link>
        <DropdownMenuSeparator />
        <Link
          href="/deconnexion"
          prefetch={false}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
        >
          <LogOut className="h-4 w-4" /> Se déconnecter
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
