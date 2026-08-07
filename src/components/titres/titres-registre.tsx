"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ExternalLink, Search } from "lucide-react";
import { TitreStatut } from "@prisma/client";
import { setTitreStatut } from "@/lib/actions/titre-actions";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";

export type TitreRow = {
  id: string;
  numero: string;
  titulaire: string;
  type: string;
  delivreLe: string;
  finValidite: string | null;
  expire: boolean;
  statut: TitreStatut;
};

const STATUT_LABELS: Record<TitreStatut, string> = {
  VALIDE: "Valide",
  EXPIRE: "Expiré",
  REVOQUE: "Révoqué",
  ANNULE: "Annulé",
  ARCHIVE: "Archivé",
};

// Statuts modifiables manuellement (EXPIRE est automatique via la date de fin).
const CHOIX: TitreStatut[] = ["VALIDE", "REVOQUE", "ANNULE", "ARCHIVE"];

const badgeClass = (s: TitreStatut, expire: boolean): string => {
  if (s === "VALIDE" && expire) return "bg-amber-100 text-amber-800";
  switch (s) {
    case "VALIDE":
      return "bg-emerald-100 text-emerald-800";
    case "REVOQUE":
    case "ANNULE":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export function TitresRegistre({ rows }: { rows: TitreRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.numero.toLowerCase().includes(s) || r.titulaire.toLowerCase().includes(s);
  });

  async function change(r: TitreRow, next: TitreStatut) {
    if (next === r.statut) return;
    if (next === "REVOQUE" || next === "ANNULE") {
      const ok = await confirm({
        title: `Passer le titre ${r.numero} en « ${STATUT_LABELS[next]} » ?`,
        description: "Il ne sera plus reconnu par la vérification publique.",
        confirmLabel: STATUT_LABELS[next],
        destructive: true,
      });
      if (!ok) return;
    }
    setBusy(r.id);
    start(async () => {
      const res = await setTitreStatut(r.id, next);
      setBusy(null);
      if (res.ok) {
        toast.success(`Titre ${r.numero} → ${STATUT_LABELS[next]}.`);
        router.refresh();
      } else toast.error(res.error ?? "Impossible de modifier le statut.");
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Aucun titre vérifiable enregistré pour le moment. Les diplômes et attestations générés
        apparaîtront ici.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un numéro ou un titulaire…"
          className="pl-8"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">N° de vérification</th>
              <th className="px-3 py-2 font-medium">Titulaire</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Délivré le</th>
              <th className="px-3 py-2 font-medium">Validité</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 font-medium">Modifier</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{r.numero}</td>
                <td className="px-3 py-2 font-medium">{r.titulaire}</td>
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2">{r.delivreLe}</td>
                <td className="px-3 py-2">
                  {r.finValidite ? (
                    <span className={r.expire ? "text-amber-700" : ""}>
                      {r.expire ? "Expiré le " : "Jusqu'au "}
                      {r.finValidite}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Sans expiration</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass(
                      r.statut,
                      r.expire,
                    )}`}
                  >
                    {r.statut === "VALIDE" && r.expire ? "Expiré" : STATUT_LABELS[r.statut]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={r.statut}
                      disabled={busy === r.id}
                      onChange={(e) => change(r, e.target.value as TitreStatut)}
                      className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {CHOIX.map((s) => (
                        <option key={s} value={s}>
                          {STATUT_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    {busy === r.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <a
                    href={`/titres/${r.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    title="Ouvrir le PDF"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
