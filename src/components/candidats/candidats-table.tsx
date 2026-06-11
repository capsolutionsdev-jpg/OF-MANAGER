"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import type { CandidatStatut } from "@prisma/client";
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
import { STATUT_LABELS } from "@/lib/validators/candidat";
import {
  QuickEnrollModal,
  type SessionOption,
} from "@/components/inscriptions/quick-enroll-modal";

export type CandidatRow = {
  id: string;
  prenom: string;
  nom: string;
  photoUrl?: string | null;
  email: string;
  telephone: string | null;
  ville: string | null;
  statut: CandidatStatut;
  formationSouhaitee: string | null;
  formationSouhaiteeId: string | null;
};

// Ordre d'affichage des états + couleur de la pastille.
const STATUT_ORDER: CandidatStatut[] = [
  "NOUVEAU",
  "EN_TRAITEMENT",
  "INSCRIT",
  "REFUSE",
  "ARCHIVE",
];

const STATUT_BADGE: Record<CandidatStatut, string> = {
  NOUVEAU: "bg-blue-500/10 text-blue-700",
  EN_TRAITEMENT: "bg-amber-500/10 text-amber-700",
  INSCRIT: "bg-emerald-500/10 text-emerald-700",
  REFUSE: "bg-red-500/10 text-red-700",
  ARCHIVE: "bg-muted text-muted-foreground",
};

export function CandidatsTable({
  candidats,
  sessions = [],
}: {
  candidats: CandidatRow[];
  sessions?: SessionOption[];
}) {
  const [query, setQuery] = useState("");
  const [statut, setStatut] = useState<CandidatStatut | "ALL">("ALL");

  // Comptes par état (pour les pastilles de filtre).
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: candidats.length };
    for (const s of STATUT_ORDER) c[s] = 0;
    for (const cand of candidats) c[cand.statut] = (c[cand.statut] ?? 0) + 1;
    return c;
  }, [candidats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidats.filter((c) => {
      if (statut !== "ALL" && c.statut !== statut) return false;
      if (!q) return true;
      const hay =
        `${c.prenom} ${c.nom} ${c.email} ${c.ville ?? ""} ${c.formationSouhaitee ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [candidats, query, statut]);

  const chips: { key: CandidatStatut | "ALL"; label: string }[] = [
    { key: "ALL", label: "Tous" },
    ...STATUT_ORDER.map((s) => ({ key: s, label: STATUT_LABELS[s] })),
  ];

  const hasSessions = sessions.length > 0;

  return (
    <div className="space-y-4">
      {/* Barre de recherche + filtres par état */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher (nom, email, ville, formation)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => {
            const active = statut === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setStatut(chip.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-transparent hover:bg-muted"
                }`}
              >
                {chip.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    active ? "bg-primary-foreground/20" : "bg-muted-foreground/15"
                  }`}
                >
                  {counts[chip.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Aucun candidat ne correspond</p>
          <p className="text-sm text-muted-foreground">
            Modifiez votre recherche ou le filtre d&apos;état.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                <TableHead>Formation souhaitée</TableHead>
                <TableHead>État</TableHead>
                {hasSessions && (
                  <TableHead className="text-right">Action</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/candidats/${c.id}`} className="flex items-center gap-2.5 hover:underline">
                      {c.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.photoUrl}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-black/10"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                          {c.prenom.charAt(0)}
                          {c.nom.charAt(0)}
                        </span>
                      )}
                      <span>{c.prenom} {c.nom}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {c.telephone ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.formationSouhaitee ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={STATUT_BADGE[c.statut]}
                    >
                      {STATUT_LABELS[c.statut]}
                    </Badge>
                  </TableCell>
                  {hasSessions && (
                    <TableCell className="text-right">
                      {c.statut !== "INSCRIT" && (
                        <QuickEnrollModal
                          candidatId={c.id}
                          candidatName={`${c.prenom} ${c.nom}`}
                          sessions={sessions}
                          formationId={c.formationSouhaiteeId ?? undefined}
                        />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
