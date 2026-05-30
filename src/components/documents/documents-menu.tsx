"use client";

import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DOCUMENT_MENU } from "@/lib/documents/templates";

export function DocumentsMenu({ inscriptionId }: { inscriptionId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Documents" />}
      >
        <FileText className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={
            <a href={`/documents/${inscriptionId}/zip`} download />
          }
        >
          <Download className="mr-2 h-4 w-4" />
          Tout télécharger (Word .zip)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {DOCUMENT_MENU.map((d) => (
          <DropdownMenuItem
            key={d.type}
            render={
              <Link
                href={`/documents/${inscriptionId}/${d.type}`}
                target="_blank"
              />
            }
          >
            {d.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
