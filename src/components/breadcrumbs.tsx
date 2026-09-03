"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Home, Copy } from "lucide-react";
import { navItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Auto-generated Breadcrumbs from current route
 *
 * Example: /sessions/123/edit → Home > Sessions > Edit
 */
export function Breadcrumbs() {
  const pathname = usePathname();

  // Parse pathname into segments
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((seg, i, arr) => ({
      label: formatLabel(seg),
      href: "/" + arr.slice(0, i + 1).join("/"),
    }));

  // Filter out admin paths, etc.
  if (pathname === "/" || !segments.length) return null;

  // Rubrique parente depuis la navigation réelle (source unique : lib/navigation.ts).
  // On retient la correspondance la plus longue (ex. /crm/pipeline → /crm).
  const parentItem = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const breadcrumbs = [
    { label: "Tableau de bord", href: "/dashboard" },
    ...(parentItem && parentItem.href !== "/dashboard"
      ? [{ label: parentItem.label, href: parentItem.href }]
      : []),
    ...segments.slice(1).map((seg) => ({
      label: seg.label,
      href: seg.href,
    })),
  ];

  const handleCopyLink = () => {
    const url = `${window.location.origin}${pathname}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Lien de la page copié."),
      () => toast.error("Copie impossible — sélectionnez le lien manuellement."),
    );
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center justify-between border-b bg-background px-4 py-2 text-sm"
    >
      <div className="flex items-center gap-1">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-colors",
                  i === 0 && "flex items-center gap-1"
                )}
              >
                {i === 0 && <Home className="h-4 w-4" />}
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Copy Link Button */}
      <button
        onClick={handleCopyLink}
        className={cn(
          "flex items-center gap-1 rounded px-2 py-1",
          "text-muted-foreground hover:bg-muted",
          "transition-colors"
        )}
        title="Copier le lien"
        aria-label="Copier le lien de la page"
      >
        <Copy className="h-4 w-4" />
      </button>
    </nav>
  );
}

/**
 * Met en forme un segment d'URL pour l'affichage.
 * Ex. : "sessions" → "Sessions", "simulateur-financement" → "Simulateur Financement".
 * Un identifiant (cuid/uuid/numérique) devient un libellé neutre « Détail »
 * plutôt qu'un hash illisible (#cmqc20ql).
 */
function formatLabel(segment: string): string {
  const looksLikeId =
    /^\d+$/.test(segment) || (/^[a-z0-9]+$/i.test(segment) && segment.length >= 16);
  if (looksLikeId) return "Détail";

  // kebab-case → Titre Lisible
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
