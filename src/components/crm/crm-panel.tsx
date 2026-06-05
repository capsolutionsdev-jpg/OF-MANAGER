"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { CrmStage } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CRM_STAGE_ORDER, CRM_STAGE_LABELS } from "@/lib/validators/crm";
import {
  setCrmStage,
  assignCandidat,
  setRelance,
  setValeurEstimee,
  updateTags,
} from "@/lib/actions/crm-actions";

const sx =
  "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function CrmPanel({
  candidatId,
  crmStage,
  assignedToId,
  valeurEstimee,
  relanceDate,
  tags,
  users,
}: {
  candidatId: string;
  crmStage: CrmStage;
  assignedToId: string | null;
  valeurEstimee: string;
  relanceDate: string; // yyyy-mm-dd or ""
  tags: string[];
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tagList, setTagList] = useState<string[]>(tags);
  const [tagInput, setTagInput] = useState("");
  const [valeur, setValeur] = useState(valeurEstimee);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Erreur.");
      else {
        toast.success(ok);
        router.refresh();
      }
    });

  function addTag(value: string) {
    const t = value.trim();
    if (!t || tagList.includes(t)) {
      setTagInput("");
      return;
    }
    const next = [...tagList, t];
    setTagList(next);
    setTagInput("");
    run(() => updateTags(candidatId, next), "Tag ajouté.");
  }
  function removeTag(t: string) {
    const next = tagList.filter((x) => x !== t);
    setTagList(next);
    run(() => updateTags(candidatId, next), "Tag retiré.");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="crmStage">Étape du pipeline</Label>
          <select
            id="crmStage"
            className={sx}
            defaultValue={crmStage}
            onChange={(e) =>
              run(
                () => setCrmStage(candidatId, e.target.value as CrmStage),
                "Étape mise à jour.",
              )
            }
          >
            {CRM_STAGE_ORDER.map((s) => (
              <option key={s} value={s}>
                {CRM_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="assignee">Commercial affecté</Label>
          <select
            id="assignee"
            className={sx}
            defaultValue={assignedToId ?? ""}
            onChange={(e) =>
              run(
                () => assignCandidat(candidatId, e.target.value || null),
                "Affectation mise à jour.",
              )
            }
          >
            <option value="">— Non affecté —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="valeur">Valeur estimée (€)</Label>
          <Input
            id="valeur"
            inputMode="decimal"
            placeholder="0"
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            onBlur={() =>
              valeur !== valeurEstimee &&
              run(
                () => setValeurEstimee(candidatId, valeur || null),
                "Valeur enregistrée.",
              )
            }
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="relance">Prochaine relance</Label>
          <Input
            id="relance"
            type="date"
            defaultValue={relanceDate}
            onChange={(e) =>
              run(
                () => setRelance(candidatId, e.target.value || null),
                "Relance programmée.",
              )
            }
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="tags">Tags / segmentation</Label>
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input p-2">
          {tagList.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="hover:text-destructive"
                aria-label={`Retirer ${t}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            onBlur={() => tagInput && addTag(tagInput)}
            placeholder="Ajouter un tag…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>
    </div>
  );
}
