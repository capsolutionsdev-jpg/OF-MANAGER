"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";

import { majPieceOrganisme } from "@/lib/actions/pieces-organisme-actions";
import {
  PIECES_ORGANISME, PIECE_STATUT_LABEL, piecesParTheme, piecesConformite,
  type PieceEtat, type PieceStatut,
} from "@/lib/audit/pieces-organisme";
import { Card, CardContent } from "@/components/ui/card";

const inputClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const STATUT_TONE: Record<PieceStatut, string> = {
  OBTENU: "text-emerald-600 dark:text-emerald-400",
  EN_COURS: "text-amber-600 dark:text-amber-400",
  A_OBTENIR: "text-red-600 dark:text-red-400",
  NA: "text-muted-foreground",
};

export function PiecesOrganismePanel({ initial }: { initial: Record<string, PieceEtat> }) {
  const [etats, setEtats] = useState<Record<string, PieceEtat>>(initial);
  const [isPending, startTransition] = useTransition();
  const groupes = piecesParTheme();
  const conf = piecesConformite(etats);

  function save(cle: string, patch: Partial<PieceEtat>) {
    setEtats((prev) => ({ ...prev, [cle]: { ...(prev[cle] ?? { statut: "A_OBTENIR" }), ...patch } }));
    startTransition(async () => {
      const res = await majPieceOrganisme(cle, patch);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4 text-sm">
          <span className="font-medium">{PIECES_ORGANISME.length} pièces</span>
          <span className="text-emerald-600 dark:text-emerald-400">{conf.obtenu} obtenues</span>
          <span className="text-amber-600 dark:text-amber-400">{conf.total - conf.obtenu} à traiter</span>
          <span className={`ml-auto font-semibold ${conf.pct >= 90 ? "text-emerald-600 dark:text-emerald-400" : conf.pct >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
            {conf.pct}% conforme
          </span>
        </CardContent>
      </Card>

      {groupes.map((g) => (
        <div key={g.theme} className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.theme}</h3>
          {g.pieces.map((p) => {
            const e = etats[p.cle] ?? { statut: "A_OBTENIR" as PieceStatut };
            return (
              <Card key={p.cle}>
                <CardContent className="grid grid-cols-1 gap-2 py-2.5 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-4">
                    <p className="text-sm">{p.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.indicateur !== "—" ? p.indicateur : "—"}
                      {e.updatedBy && e.updatedAt ? ` · maj ${e.updatedBy} le ${new Date(e.updatedAt).toLocaleDateString("fr-FR")}` : ""}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <select
                      className={`${inputClass} font-semibold ${STATUT_TONE[e.statut]}`}
                      value={e.statut}
                      disabled={isPending}
                      onChange={(ev) => save(p.cle, { statut: ev.target.value as PieceStatut })}
                    >
                      {(Object.keys(PIECE_STATUT_LABEL) as PieceStatut[]).map((s) => (
                        <option key={s} value={s}>{PIECE_STATUT_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    className={`${inputClass} md:col-span-2`} placeholder="Responsable"
                    defaultValue={e.responsable ?? ""}
                    onBlur={(ev) => { if ((ev.target.value || "") !== (e.responsable ?? "")) save(p.cle, { responsable: ev.target.value }); }}
                  />
                  <input
                    className={`${inputClass} md:col-span-2`} type="date"
                    defaultValue={e.dateObtention ?? ""}
                    onChange={(ev) => save(p.cle, { dateObtention: ev.target.value })}
                  />
                  <input
                    className={`${inputClass} md:col-span-2`} placeholder="Fichier / observations"
                    defaultValue={e.nomFichier ?? ""}
                    onBlur={(ev) => { if ((ev.target.value || "") !== (e.nomFichier ?? "")) save(p.cle, { nomFichier: ev.target.value }); }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5" /> Enregistrement automatique à chaque modification.
      </p>
    </div>
  );
}
