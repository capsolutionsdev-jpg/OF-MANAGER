"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home, Copy } from "lucide-react";
import { navigationGroups } from "@/lib/navigation-groups";
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

  // Find the parent item from navigation
  const parentItem = navigationGroups
    .flatMap((g) => g.items)
    .find((item) => pathname.startsWith(item.href));

  const breadcrumbs = [
    { label: "Home", href: "/dashboard" },
    ...(parentItem ? [{ label: parentItem.label, href: parentItem.href }] : []),
    ...segments.slice(1).map((seg) => ({
      label: seg.label,
      href: seg.href,
    })),
  ];

  const handleCopyLink = () => {
    const url = `${window.location.origin}${pathname}`;
    navigator.clipboard.writeText(url);
    // TODO: Show toast "Copied!"
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
        title="Copy link"
        aria-label="Copy page link"
      >
        <Copy className="h-4 w-4" />
      </button>
    </nav>
  );
}

/**
 * Format URL segment to display label
 * e.g., "sessions" → "Sessions", "123" → "ID: 123"
 */
function formatLabel(segment: string): string {
  // If it looks like an ID, shorten it
  if (/^\d+$/.test(segment) || segment.length > 20) {
    return `#${segment.substring(0, 8)}`;
  }

  // Convert kebab-case to Title Case
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
