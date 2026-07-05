"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle, Eye, Loader2 } from "lucide-react";
import { DOCUMENT_MENU } from "@/lib/documents/templates";
import { toggleDocSigne } from "@/lib/actions/document-actions";

type Info = { nom: string; date: string };
type Doc = { type: string; label: string; href?: string };

/**
 * Checklist de validation de TOUS les documents (candidat, formateur, session),
 * validés un par un avec traçabilité du collaborateur.
 */
export function DocsSignesChecklist({
  inscriptionId,
  sessionId,
  docsSignes,
}: {
  inscriptionId: string;
  sessionId?: string;
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

  const groups: { cat: string; docs: Doc[] }[] = [
    {
      cat: "Documents du candidat",
      docs: DOCUMENT_MENU.map((d) => ({
        type: d.type,
        label: d.label,
        href: `/documents/${inscriptionId}/${d.type}`,
      })),
    },
    {
      cat: "Documents du formateur",
      docs: [
        {
          type: "CONTRAT_FORMATEUR",
          label: "Contrat de sous-traitance formateur",
          href: sessionId ? `/documents/contrat-formateur/${sessionId}` : undefined,
        },
        { type: "COMPTE_RENDU_FORMATEUR", label: "Compte-rendu pédagogique" },
      ],
    },
    {
      cat: "Documents de la session",
      docs: [
        { type: "FEUILLE_EMARGEMENT", label: "Feuille d'émargement" },
        { type: "FEUILLE_PRESENCE", label: "Feuille de présence" },
      ],
    },
  ];

  const totalDocs = groups.reduce((n, g) => n + g.docs.length, 0);
  const done = Object.keys(local).length;

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

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        Validez chaque document un par un ({done}/{totalDocs})
      </p>
      {groups.map((g) => (
        <div key={g.cat}>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.cat}</p>
          <ul className="space-y-0.5">
            {g.docs.map((d) => {
              const info = local[d.type];
              const ok = !!info;
              return (
                <li key={d.type} className="flex items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50">
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
                  {d.href && (
                    <a
                      href={d.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-flex items-center rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Ouvrir le document"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
