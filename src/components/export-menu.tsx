"use client";

import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/**
 * Menu d'export réutilisable : propose le même jeu de données en
 * Excel (.xlsx), PDF et CSV. `href` est la route d'export ; le format est
 * transmis via `?format=`.
 */
export function ExportMenu({
  href,
  label = "Exporter",
  size,
  variant = "outline",
}: {
  href: string;
  label?: string;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "ghost";
}) {
  const sep = href.includes("?") ? "&" : "?";
  const url = (f: string) => `${href}${sep}format=${f}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant={variant} size={size} />}>
        <Download className="mr-2 h-4 w-4" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem render={<a href={url("xlsx")} download />}>
          <FileSpreadsheet className="text-emerald-600" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={url("pdf")} download />}>
          <FileText className="text-rose-600" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={url("csv")} download />}>
          <FileType className="text-muted-foreground" /> CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
