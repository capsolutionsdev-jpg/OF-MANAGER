"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, GraduationCap, FileText, Receipt, LayoutGrid, FileSignature, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/espace-entreprise", label: "Accueil", icon: LayoutGrid, exact: true },
  { href: "/espace-entreprise/formation", label: "Formations", icon: CalendarDays },
  { href: "/espace-entreprise/inscriptions", label: "Inscriptions", icon: ClipboardList },
  { href: "/espace-entreprise/convention", label: "Convention", icon: FileSignature },
  { href: "/espace-entreprise/dossiers", label: "Dossiers", icon: FolderOpen },
  { href: "/espace-entreprise/suivi", label: "Suivi", icon: GraduationCap },
  { href: "/espace-entreprise/documents", label: "Documents", icon: FileText },
  { href: "/espace-entreprise/factures", label: "Factures", icon: Receipt },
];

export function EntrepriseNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation de l'espace client" className="-mb-px flex gap-1 overflow-x-auto">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
