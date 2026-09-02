"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Undo2 } from "lucide-react";

import { validerSessionCheck, annulerSessionCheck } from "@/lib/actions/audit-controle-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type SessionCheckDto = {
  key: string;
  label: string;
  indicateur: number | null;
  statut: "OK" | "PARTIEL" | "MANQUANT" | "NA";
  detail: string;
  visa?: { nom?: string; date?: string } | null;
};

const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : null);

const TONE: Record<string, string> = {
  OK: "text-emerald-600 dark:text-emerald-400",
  PARTIEL: "text-amber-600 dark:text-amber-400",
  MANQUANT: "text-red-600 dark:text-red-400",
  NA: "text-muted-foreground",
};
const LABEL: Record<string, string> = { OK: "Présent", PARTIEL: "Partiel", MANQUANT: "Manquant", NA: "N/A" };

export function AuditSessionDocs({ auditId, checks }: { auditId: string; checks: SessionCheckDto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function valider(key: string) {
    startTransition(async () => {
      const res = await validerSessionCheck(auditId, key);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Document validé.");
      router.refresh();
    });
  }
  function annuler(key: string) {
    startTransition(async () => {
      const res = await annulerSessionCheck(auditId, key);
      if (!res.ok) { toast.error(res.error); return; }
      router.refresh();
    });
  }

  const applicables = checks.filter((c) => c.statut !== "NA");
  const ok = applicables.filter((c) => c.statut === "OK").length;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <span className="font-medium">Documents Qualiopi de la session</span>
        <span className={`text-xs ${ok === applicables.length ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
          {ok}/{applicables.length} en place
        </span>
      </div>
      <CardContent className="pt-3">
        <ul className="grid grid-cols-1 gap-1.5">
          {checks.map((c) => {
            const isOk = c.statut === "OK";
            const isNa = c.statut === "NA";
            return (
              <li key={c.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-sm">
                <span className="min-w-0 flex-1">
                  {c.label}
                  {c.indicateur ? <span className="ml-1 text-[11px] text-muted-foreground">(ind. {c.indicateur})</span> : null}
                  {c.detail ? <span className="ml-1 text-[11px] text-muted-foreground">· {c.detail}</span> : null}
                  {c.visa && (
                    <span className="ml-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                      ✓ visé{c.visa.nom ? ` par ${c.visa.nom}` : ""}{c.visa.date ? ` le ${fmt(c.visa.date)}` : ""}
                    </span>
                  )}
                </span>
                <span className={`text-xs font-semibold ${TONE[c.statut]}`}>{LABEL[c.statut]}</span>
                {!isNa && (
                  <div className="flex items-center gap-1.5">
                    {c.visa ? (
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" disabled={isPending} onClick={() => annuler(c.key)} title="Retirer le visa">
                        <Undo2 className="h-3 w-3" /> Annuler
                      </Button>
                    ) : (
                      !isOk && (
                        <Button size="sm" variant="secondary" className="h-7 gap-1 text-xs" disabled={isPending} onClick={() => valider(c.key)} title="Marquer comme fait / présent (visa)">
                          <Check className="h-3 w-3" /> Valider
                        </Button>
                      )
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
