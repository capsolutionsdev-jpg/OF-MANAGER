"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Settings, Building2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatutSelect } from "@/components/console/statut-actions";
import { euros } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { OrgRow } from "@/lib/console-stats";

const FILTERS = [
  { key: "TOUS", label: "Tous" },
  { key: "ACTIF", label: "Actifs" },
  { key: "ESSAI", label: "Essais" },
  { key: "SUSPENDU", label: "Suspendus" },
];

const PLAN_BADGE: Record<string, string> = {
  BASIQUE: "bg-slate-500/10 text-slate-600",
  MEDIUM: "bg-blue-500/10 text-blue-700",
  COMPLET: "bg-violet-500/10 text-violet-700",
};

export function OrganismesTable({ rows }: { rows: OrgRow[] }) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("TOUS");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statut !== "TOUS" && r.statut !== statut) return false;
      if (!needle) return true;
      return (
        r.nom.toLowerCase().includes(needle) ||
        (r.sousDomaine ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, statut]);

  const counts = useMemo(() => ({
    TOUS: rows.length,
    ACTIF: rows.filter((r) => r.statut === "ACTIF").length,
    ESSAI: rows.filter((r) => r.statut === "ESSAI").length,
    SUSPENDU: rows.filter((r) => r.statut === "SUSPENDU").length,
  }), [rows]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un organisme…"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatut(f.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                statut === f.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label} <span className="opacity-60">{counts[f.key as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisme</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Formule</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Comptes</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Candidats</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link href={`/console/${r.id}`} className="font-medium hover:underline">{r.nom}</Link>
                      {r.version && (
                        <Badge variant="secondary" className="text-[10px] font-normal">{r.version}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{r.sousDomaine ? `${r.sousDomaine}.ofmanager.fr` : "—"}</span>
                      {r.appUrl && (
                        <a
                          href={r.appUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Ouvrir l&apos;app
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><StatutSelect id={r.id} statut={r.statut} /></TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge className={cn("text-[11px]", PLAN_BADGE[r.planKey])}>{r.planName}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right text-muted-foreground">{r.userCount}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right text-muted-foreground">{r.candidatCount}</TableCell>
                  <TableCell className="text-right font-medium">{r.mrr ? euros(r.mrr) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" render={<Link href={`/console/${r.id}`} />}>
                      <Settings className="mr-1.5 h-3.5 w-3.5" /> Configurer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center gap-2 p-10 text-center">
                      <Building2 className="h-7 w-7 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Aucun organisme ne correspond.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
