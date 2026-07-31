"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  importerCatalogueSecurite,
  type ImportRapport,
} from "@/lib/actions/catalogue-actions";

/**
 * Importe le catalogue de référence sécurité (SSIAP / SST / APS) dans le
 * catalogue de l'organisme : crée les formations absentes et complète les
 * champs vides des formations existantes — sans jamais écraser une saisie.
 */
export function ImportCatalogueButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rapport, setRapport] = useState<ImportRapport | null>(null);
  const [pending, start] = useTransition();

  function lancer() {
    start(async () => {
      const r = await importerCatalogueSecurite();
      if (!r.ok) {
        toast.error(r.error ?? "Import impossible.");
        return;
      }
      setRapport(r);
      const total = r.creees.length + r.completees.length;
      toast.success(
        total === 0
          ? "Catalogue déjà à jour — rien à importer."
          : `${r.creees.length} formation(s) créée(s), ${r.completees.length} complétée(s).`,
      );
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => { setRapport(null); setOpen(true); }}>
        <ShieldCheck className="mr-2 h-4 w-4" /> Catalogue sécurité
      </Button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card p-5 shadow-lg">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="h-5 w-5 text-primary" /> Catalogue de référence sécurité
            </h2>

            {!rapport ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Importe les formations réglementaires <strong>SSIAP 1/2/3</strong> (initial,
                  recyclage, remise à niveau), <strong>SST</strong> et <strong>MAC SST</strong>{" "}
                  (grilles INRS), <strong>TFP APS</strong> et <strong>MAC APS</strong> : programme,
                  objectifs, prérequis, durées, pièces du dossier et réglages (examen, jury,
                  grille de certification).
                </p>
                <p className="mt-2 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
                  Sans risque : vos formations existantes ne sont <strong>jamais écrasées</strong>.
                  Seuls les champs vides sont complétés ; les formations absentes sont créées.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                    Annuler
                  </Button>
                  <Button onClick={lancer} disabled={pending}>
                    {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    {pending ? "Import en cours…" : "Importer"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-3 space-y-3 text-sm">
                  <Bloc titre="Créées" items={rapport.creees} ton="emerald" />
                  <Bloc
                    titre="Complétées"
                    items={rapport.completees.map((c) => `${c.titre} (${c.champs.length} champ${c.champs.length > 1 ? "s" : ""})`)}
                    ton="blue"
                  />
                  <Bloc titre="Déjà à jour" items={rapport.inchangees} ton="muted" />
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
  ton: "emerald" | "blue" | "muted";
}) {
  if (items.length === 0) return null;
  const cls =
    ton === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : ton === "blue"
        ? "text-blue-700 dark:text-blue-400"
        : "text-muted-foreground";
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
