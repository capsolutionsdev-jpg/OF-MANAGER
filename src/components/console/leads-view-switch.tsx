"use client";

import { useSyncExternalStore } from "react";
import { Columns3, List, MapPinned } from "lucide-react";
import { LeadsTable, type LeadRow } from "@/components/console/leads-table";
import { LeadsKanban, type LeadKanbanRow } from "@/components/console/leads-kanban";
import { LeadsCrmList } from "@/components/console/leads-crm-list";
import { cn } from "@/lib/utils";

type Vue = "pipeline" | "liste" | "secteur";

/** Clé localStorage mémorisant la vue choisie (pipeline par défaut). */
const STORAGE_KEY = "console-leads-view";

const VUES_VALIDES: Vue[] = ["pipeline", "liste", "secteur"];

// Mini-store externe : localStorage + abonnés locaux (setItem ne déclenche pas
// l'événement « storage » dans le même onglet). Compatible SSR via le snapshot serveur.
let abonnes: (() => void)[] = [];

function lireVue(): Vue {
  const v = window.localStorage.getItem(STORAGE_KEY) as Vue | null;
  return v && VUES_VALIDES.includes(v) ? v : "pipeline";
}

function ecrireVue(v: Vue) {
  window.localStorage.setItem(STORAGE_KEY, v);
  abonnes.forEach((notifie) => notifie());
}

function sAbonner(notifie: () => void) {
  abonnes.push(notifie);
  window.addEventListener("storage", notifie);
  return () => {
    abonnes = abonnes.filter((n) => n !== notifie);
    window.removeEventListener("storage", notifie);
  };
}

const VUES: { key: Vue; label: string; icone: typeof List }[] = [
  { key: "pipeline", label: "Pipeline", icone: Columns3 },
  { key: "liste", label: "Liste", icone: List },
  { key: "secteur", label: "Secteur", icone: MapPinned },
];

/** Bascule Liste / Pipeline pour les prospects, avec persistance du choix. */
export function LeadsViewSwitch({ leads }: { leads: LeadKanbanRow[] }) {
  // Vue par défaut = pipeline (aussi côté serveur, sans écart d'hydratation).
  const vue = useSyncExternalStore(sAbonner, lireVue, () => "pipeline" as Vue);

  // La vue liste consomme le type LeadRow historique : LeadKanbanRow en est un
  // sur-type structurel (score et tâches y sont simplement ignorés).
  const lignesListe: LeadRow[] = leads;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
          {VUES.map((v) => {
            const Icone = v.icone;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => ecrireVue(v.key)}
                aria-pressed={vue === v.key}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  vue === v.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icone className="h-3.5 w-3.5" />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>
      {vue === "pipeline" ? (
        <LeadsKanban leads={leads} />
      ) : vue === "secteur" ? (
        <LeadsCrmList leads={lignesListe} />
      ) : (
        <LeadsTable leads={lignesListe} />
      )}
    </div>
  );
}
