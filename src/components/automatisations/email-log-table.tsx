"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EMAIL_STATUT_LABELS } from "./labels";

export type EmailRow = {
  id: string;
  destinataire: string;
  sujet: string;
  statut: string;
  date: string; // ISO
};

const STATUT_FILTERS: { value: string; label: string }[] = [
  { value: "TOUS", label: "Tous les statuts" },
  { value: "ENVOYE", label: "Envoyé" },
  { value: "ECHEC", label: "Échec" },
  { value: "EN_ATTENTE", label: "En attente" },
];

const selectCx =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Journal des e-mails : recherche par destinataire + filtre par statut. */
export function EmailLogTable({ emails }: { emails: EmailRow[] }) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("TOUS");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return emails.filter((e) => {
      if (needle && !e.destinataire.toLowerCase().includes(needle)) return false;
      if (statut !== "TOUS" && e.statut !== statut) return false;
      return true;
    });
  }, [emails, q, statut]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un destinataire…"
            className="h-8 pl-8"
            aria-label="Rechercher un destinataire"
          />
        </div>
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className={selectCx}
          aria-label="Filtrer par statut"
        >
          {STATUT_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {emails.length === 0
              ? "Aucun e-mail envoyé pour le moment. (Ex. : « Envoyer les convocations » depuis une session.)"
              : "Aucun e-mail ne correspond à ces filtres."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destinataire</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">
                    {e.destinataire}
                  </TableCell>
                  <TableCell className="font-medium">{e.sujet}</TableCell>
                  <TableCell>
                    <Badge variant={e.statut === "ENVOYE" ? "default" : "secondary"}>
                      {EMAIL_STATUT_LABELS[e.statut] ?? e.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(e.date).toLocaleDateString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
