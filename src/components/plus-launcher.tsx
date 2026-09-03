"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import type { RailGroup } from "@/lib/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Launcher « Plus / Tous les modules » : range tout ce qui n'est pas quotidien
 * dans un panneau thématique, ouvert en un clic. Rien n'est supprimé — juste
 * sorti de la barre permanente.
 *
 * Rend son propre déclencheur (bouton en bas du rail) ; replié → icône seule.
 */
export function PlusLauncher({
  secondary,
  collapsed = false,
  onNavigate,
}: {
  secondary: RailGroup[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (secondary.length === 0) return null;

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Tous les modules"
        aria-label="Tous les modules"
        className={cn(
          "flex items-center gap-2.5 rounded-lg border border-dashed border-[#2a3a52] text-[#8cbcff] transition-colors hover:bg-[#1f2d47]",
          collapsed ? "h-9 w-9 justify-center" : "w-full px-2.5 py-2 text-[13px] font-medium",
        )}
      >
        <LayoutGrid className="h-[17px] w-[17px] shrink-0" />
        {!collapsed && <span className="rail-label">Plus — tous les modules</span>}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              Tous les modules
            </DialogTitle>
            <DialogDescription>
              Les fonctions hors quotidien, rangées par thème. Astuce : appuyez sur ⌘K
              pour sauter directement à une page.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {secondary.map((group) => (
              <section key={group.name}>
                <h3 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.name}
                </h3>
                <ul className="space-y-0.5">
                  {group.items.map((it) => (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        onClick={close}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <it.icon className="h-[15px] w-[15px] shrink-0 text-muted-foreground" />
                        <span className="min-w-0 truncate">{it.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
