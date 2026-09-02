"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ClipboardCheck, Shuffle } from "lucide-react";

import { creerAudit } from "@/lib/actions/audit-controle-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

export type SessionOpt = { id: string; label: string };

const TYPES = [
  { v: "INTERNE", label: "Interne (auto-contrôle)" },
  { v: "CONTROLE", label: "Contrôle externe (notification EDOF/CDC…)" },
  { v: "ALEATOIRE", label: "Aléatoire (session au hasard)" },
] as const;

/** Formulaire de création d'un audit (type + périmètre). */
export function CreerAuditForm({ sessions }: { sessions: SessionOpt[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"INTERNE" | "CONTROLE" | "ALEATOIRE">("INTERNE");
  const [perimetre, setPerimetre] = useState<"SESSION" | "DOSSIER">("SESSION");
  const [sessionId, setSessionId] = useState("");

  const aleatoire = type === "ALEATOIRE";

  function submit() {
    startTransition(async () => {
      const res = await creerAudit({
        type,
        perimetre: aleatoire ? "SESSION" : perimetre,
        sessionId: sessionId || undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Audit créé.");
      router.push(`/audit/${res.id}`);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4 text-primary" /> Créer un audit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="a-type">Type d&apos;audit</Label>
            <select id="a-type" className={selectClass} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {TYPES.map((t) => (<option key={t.v} value={t.v}>{t.label}</option>))}
            </select>
          </div>

          {!aleatoire && (
            <div className="grid gap-1.5">
              <Label htmlFor="a-perim">Périmètre</Label>
              <select id="a-perim" className={selectClass} value={perimetre} onChange={(e) => setPerimetre(e.target.value as typeof perimetre)}>
                <option value="SESSION">Une session (tous les inscrits)</option>
                <option value="DOSSIER">Un dossier précis</option>
              </select>
            </div>
          )}

          {!aleatoire && perimetre === "SESSION" && (
            <div className="grid gap-1.5">
              <Label htmlFor="a-sess">Session</Label>
              <select id="a-sess" className={selectClass} value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                <option value="">— Choisir —</option>
                {sessions.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
              </select>
            </div>
          )}
        </div>

        {aleatoire && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shuffle className="h-4 w-4" /> Une session sera tirée au hasard parmi les sessions actives.
          </p>
        )}
        {!aleatoire && perimetre === "DOSSIER" && (
          <p className="text-sm text-muted-foreground">
            Pour auditer un dossier précis : lancez l&apos;audit d&apos;une session, puis ouvrez le dossier ;
            ou créez-le depuis la fiche du candidat (à venir). Pour l&apos;instant, choisissez « Une session ».
          </p>
        )}

        <Button onClick={submit} disabled={isPending || (!aleatoire && perimetre === "SESSION" && !sessionId) || (!aleatoire && perimetre === "DOSSIER")}>
          <Plus className="mr-1.5 h-4 w-4" /> {isPending ? "Création…" : "Créer l'audit"}
        </Button>
      </CardContent>
    </Card>
  );
}
