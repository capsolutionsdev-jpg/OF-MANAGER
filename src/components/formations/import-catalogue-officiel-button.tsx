"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Loader2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  importerCatalogueOfficiel,
  type ImportOfficielRapport,
} from "@/lib/actions/catalogue-officiel-actions";

/**
 * Aligne le catalogue de l'organisme sur le CATALOGUE OFFICIEL de référence
 * (source ofmanager.info) : crée/complète les 30 fiches officielles et archive
 * (réversible) celles qui n'en font pas partie. Réservé à l'organisme de la
 * vitrine (garde côté action).
 */
export function ImportCatalogueOfficielButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rapport, setRapport] = useState<ImportOfficielRapport | null>(null);
  const [pending, start] = useTransition();

  function lancer() {
    start(async () => {
      const r = await importerCatalogueOfficiel();
      if (!r.ok) {
        toast.error(r.error ?? "Import impossible.");
        return;
      }
      setRapport(r);
      toast.success(
        `${r.creees.length} créée(s) · ${r.misesAJour.length} mise(s) à jour · ${r.archivees.length} archivée(s).`,
      );
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => { setRapport(null); setOpen(true); }}>
        <BadgeCheck className="mr-2 h-4 w-4" /> Catalogue officiel
      </Button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card p-5 shadow-lg">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <BadgeCheck className="h-5 w-5 text-primary" /> Catalogue officiel
            </h2>

            {!rapport ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Aligne votre catalogue sur les <strong>30 formations officielles</strong>{" "}
                  (Sécurité + Transport) du catalogue de référence :
                  programme, durée, prérequis, public, évaluation, certification et réglage
                  « soumis à examen ». Les fiches existantes sont mises à jour.
                </p>
                <p className="mt-2 flex gap-2 rounded-md bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Les formations qui ne font <strong>pas</strong> partie du catalogue officiel
                    seront <strong>archivées</strong> (réversible — elles ne sont pas supprimées et
                    leurs sessions sont conservées).
                  </span>
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                    Annuler
                  </Button>
                  <Button onClick={lancer} disabled={pending}>
                    {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    {pending ? "Import en cours…" : "Importer le catalogue officiel"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-3 space-y-3 text-sm">
                  <Bloc titre="Créées" items={rapport.creees} ton="emerald" />
                  <Bloc titre="Mises à jour" items={rapport.misesAJour} ton="blue" />
                  <Bloc titre="Archivées" items={rapport.archivees} ton="amber" />
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setOpen(false)}>Fermer</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Bloc({
  titre,
  items,
  ton,
}: {
  titre: string;
  items: string[];
  ton: "emerald" | "blue" | "amber";
}) {
  if (items.length === 0) return null;
  const cls =
    ton === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : ton === "blue"
        ? "text-blue-700 dark:text-blue-400"
        : "text-amber-700 dark:text-amber-400";
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wide ${cls}`}>
        {titre} ({items.length})
      </p>
      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {items.map((t) => (
          <li key={t}>• {t}</li>
        ))}
      </ul>
    </div>
  );
}
