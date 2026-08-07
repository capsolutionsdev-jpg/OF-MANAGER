"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { runAssistant, type AiMode } from "@/lib/actions/ai-actions";

export type AiCandidat = { id: string; label: string };

const MODES: { value: AiMode; label: string; needsInstruction?: boolean }[] = [
  { value: "relance", label: "Rédiger une relance" },
  { value: "qualification", label: "Qualifier le prospect" },
  { value: "resume", label: "Résumer la situation" },
  { value: "libre", label: "Consigne libre", needsInstruction: true },
];

export function AssistantPanel({
  candidats,
  configured,
}: {
  candidats: AiCandidat[];
  configured: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<AiMode>("relance");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await runAssistant(formData);
      if (res.ok) {
        setOutput(res.text);
      } else {
        toast.error(res.error);
      }
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Copié.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copie impossible.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form ref={formRef} action={onSubmit} className="space-y-3 rounded-xl border bg-muted/30 p-4">
        {!configured && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
            Mode démo : l&apos;assistant est branché mais aucune clé IA n&apos;est configurée.
            Ajoutez <code>ANTHROPIC_API_KEY</code> à l&apos;environnement pour activer la génération.
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="mode">Que voulez-vous faire ?</Label>
          <select
            id="mode"
            name="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as AiMode)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="candidatId">Prospect (contexte, facultatif pour une consigne libre)</Label>
          <select
            id="candidatId"
            name="candidatId"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue=""
          >
            <option value="">— Aucun —</option>
            {candidats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="instruction">Consigne / précisions</Label>
          <Textarea
            id="instruction"
            name="instruction"
            rows={4}
            placeholder="Ex. propose un créneau d'appel cette semaine et mentionne le financement CPF"
          />
        </div>

        <Button type="submit" disabled={isPending}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          {isPending ? "Génération…" : "Générer"}
        </Button>
      </form>

      <div className="rounded-xl border bg-background p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Résultat</span>
          {output && (
            <Button type="button" size="sm" variant="outline" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
        </div>
        {output ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{output}</pre>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Le texte généré apparaîtra ici.
          </p>
        )}
      </div>
    </div>
  );
}
