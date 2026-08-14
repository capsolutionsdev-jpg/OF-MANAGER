"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Command } from "lucide-react";
import { navigationGroups } from "@/lib/navigation-groups";
import { cn } from "@/lib/utils";

/**
 * Global Command Palette (Cmd+K / Ctrl+K)
 * Search and navigate to any page in the app
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Flatten all items from all groups
  const allItems = navigationGroups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      groupLabel: group.label,
    }))
  );

  // Filter items based on search
  const filtered = allItems.filter((item) =>
    `${item.label} ${item.groupLabel}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
        setSearch("");
        setSelectedIndex(0);
      }

      // Escape to close
      if (e.key === "Escape" && open) {
        setOpen(false);
      }

      // Arrow up/down to navigate
      if (open) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filtered.length - 1)
          );
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
        }

        // Enter to navigate — clamp selectedIndex pour éviter crash
        if (e.key === "Enter" && filtered.length > 0) {
          e.preventDefault();
          const safeIndex = Math.min(selectedIndex, filtered.length - 1);
          const target = filtered[safeIndex];
          if (target) {
            router.push(target.href);
            setOpen(false);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, search, filtered, selectedIndex, router]);

  // Clamp selectedIndex quand filtered change (ex: recherche affinée)
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-lg border bg-background shadow-lg">
          {/* Search Input */}
          <div className="flex items-center border-b px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="Chercher une page..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              className={cn(
                "flex-1 bg-transparent px-3 py-1 outline-none",
                "text-lg placeholder-muted-foreground"
              )}
            />
            <span className="text-xs text-muted-foreground">Esc</span>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {filtered.length > 0 ? (
              <ul className="space-y-1 p-2">
                {filtered.map((item, index) => (
                  <li
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setOpen(false);
                    }}
                    className={cn(
                      "rounded-md px-3 py-2 cursor-pointer transition-colors",
                      index === selectedIndex
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.groupLabel}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun résultat trouvé
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <kbd className="rounded border bg-muted px-2 py-1">↑↓</kbd>
              <span>Naviguer</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="rounded border bg-muted px-2 py-1">Enter</kbd>
              <span>Sélectionner</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
