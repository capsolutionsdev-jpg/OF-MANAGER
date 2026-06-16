"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { setOrganismeStatut, setSupportStatut } from "@/lib/actions/console-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUTS = [
  { key: "ESSAI", label: "Essai" },
  { key: "ACTIF", label: "Actif" },
  { key: "SUSPENDU", label: "Suspendu" },
];

/** Sélecteur de statut (liste des organismes) — change en 1 clic. */
export function StatutSelect({ id, statut }: { id: string; statut: string }) {
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        defaultValue={statut}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          start(() => setOrganismeStatut(id, v));
        }}
        className="h-8 rounded-md border bg-transparent px-2 text-xs font-medium"
        aria-label="Statut de l'organisme"
      >
        {STATUTS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </span>
  );
}

const SUPPORT_STATUTS = [
  { key: "OUVERT", label: "Ouvert" },
  { key: "EN_COURS", label: "En cours" },
  { key: "RESOLU", label: "Résolu" },
];

/** Sélecteur de statut d'un ticket de support (inbox console). */
export function SupportStatutSelect({ id, statut }: { id: string; statut: string }) {
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        defaultValue={statut}
        disabled={pending}
        onChange={(e) => { const v = e.target.value; start(() => setSupportStatut(id, v)); }}
        className="h-8 rounded-md border bg-transparent px-2 text-xs font-medium"
        aria-label="Statut du ticket"
      >
        {SUPPORT_STATUTS.map((s) => (
          <option key={s.key} value={s.key}>{s.label}</option>
        ))}
      </select>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </span>
  );
}

/** Bouton « Convertir l'essai en client » (alertes du tableau de bord). */
export function ConvertButton({ id, className }: { id: string; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      className={cn("h-7 gap-1.5 px-2.5 text-xs", className)}
      onClick={() => start(() => setOrganismeStatut(id, "ACTIF"))}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      Convertir en client
    </Button>
  );
}
