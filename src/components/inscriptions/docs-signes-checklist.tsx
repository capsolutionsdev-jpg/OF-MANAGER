"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle, Eye, Loader2 } from "lucide-react";
import { SIGNABLE_DOCS } from "@/lib/signable-docs";
import { toggleDocSigne } from "@/lib/actions/document-actions";

type Info = { nom: string; date: string };

/** Validation « signé sur place » document par document, avec traçabilité. */
export function DocsSignesChecklist({
  inscriptionId,
  docsSignes,
}: {
  inscriptionId: string;
  docsSignes?: Record<string, Info>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState<Record<string, Info>>(docsSignes ?? {});

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    } catch {
      return "";
    }
  };

  function toggle(type: string) {
    const signe = !local[type];
    setBusy(type);
    startTransition(async () => {
      const r = await toggleDocSigne(inscriptionId, type, signe);
      setBusy(null);
      if (r.ok) {
        setLocal((cur) => {
          const next = { ...cur };
          if (signe) next[type] = { nom: "vous", date: new Date().toISOString() };
          else delete next[type];
          return next;
        });
        router.refresh();
      } else toast.error(r.error);
    });
  }

  const done = SIGNABLE_DOCS.filter((d) => local[d.type]).length;

  return (
    <div className="space-y-1">
      <p className="mb-1 text-xs text-muted-foreground">
        Signés sur place — validez chaque document ({done}/{SIGNABLE_DOCS.length})
      </p>
      <ul className="space-y-1">
        {SIGNABLE_DOCS.map((d) => {
          const info = local[d.type];
          const ok = !!info;
          return (
            <li key={d.type} className="flex items-start gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted/50">
              <button
                type="button"
                onClick={() => toggle(d.type)}
                disabled={busy === d.type}
                className="flex flex-1 items-start gap-2 text-left disabled:opacity-60"
              >
                {busy === d.type ? (
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1">
                  <span className={ok ? "text-foreground" : "text-muted-foreground"}>{d.label}</span>
                  {info && (
                    <span className="mt-0.5 block text-[11px] text-emerald-700">
                      ✓ validé par {info.nom}{info.date ? ` · ${fmt(info.date)}` : ""}
                    </span>
                  )}
                </span>
              </button>
              <a
                href={`/documents/${inscriptionId}/${d.type}`}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Ouvrir le document"
              >
                <Eye className="h-3.5 w-3.5" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
