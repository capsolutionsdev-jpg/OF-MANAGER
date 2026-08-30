"use client";
import { useState, useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import type { CorbeilleItem, CorbeilleModele } from "@/lib/corbeille";
import { restaurerCorbeille, purgerCorbeille } from "@/lib/actions/corbeille-actions";

export function CorbeilleClient({
  modele,
  items,
}: {
  modele: CorbeilleModele;
  items: CorbeilleItem[];
}) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const restore = (id: string) =>
    start(async () => {
      setError(null);
      const res = await restaurerCorbeille(modele, id);
      if (res.ok) setGone((s) => new Set(s).add(id));
      else setError(res.error ?? "Restauration impossible.");
    });

  const purge = (id: string) =>
    start(async () => {
      setError(null);
      const res = await purgerCorbeille(modele, id);
      if (res.ok) setGone((s) => new Set(s).add(id));
      else setError(res.error ?? "Suppression impossible.");
      setConfirmId(null);
    });

  const visible = items.filter((it) => !gone.has(it.id));
  if (visible.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">Aucun élément.</p>;
  }

  return (
    <>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <ul className="divide-y">
        {visible.map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{it.label}</div>
              {it.deletedAt && (
                <div className="text-xs text-muted-foreground">
                  Supprimé le {new Date(it.deletedAt).toLocaleDateString("fr-FR")}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => restore(it.id)}
                className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restaurer
              </button>
              {confirmId === it.id ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => purge(it.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Confirmer la purge
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmId(it.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Purger
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
