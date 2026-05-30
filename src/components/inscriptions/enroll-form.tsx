"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import {
  inscriptionFormSchema,
  type InscriptionFormValues,
  INSCRIPTION_STATUT_LABELS,
} from "@/lib/validators/inscription";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { createInscription } from "@/lib/actions/inscription-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

type CandidatOption = { id: string; nom: string; prenom: string };

export function EnrollForm({
  sessionId,
  candidats,
}: {
  sessionId: string;
  candidats: CandidatOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset } = useForm<InscriptionFormValues>({
    resolver: zodResolver(inscriptionFormSchema),
    defaultValues: {
      candidatId: "",
      sessionId,
      financementType: "",
      statut: "EN_ATTENTE",
      montant: "",
    },
  });

  function onSubmit(values: InscriptionFormValues) {
    startTransition(async () => {
      const res = await createInscription(values);
      if (res.ok) {
        toast.success("Candidat inscrit à la session.");
        reset({
          candidatId: "",
          sessionId,
          financementType: "",
          statut: "EN_ATTENTE",
          montant: "",
        });
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (candidats.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tous les candidats sont déjà inscrits à cette session (ou aucun candidat
        n&apos;existe encore).
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
    >
      <input type="hidden" {...register("sessionId")} />
      <div className="grid gap-2 lg:col-span-2">
        <Label htmlFor="candidatId">Candidat</Label>
        <select id="candidatId" className={selectClass} {...register("candidatId")}>
          <option value="">— Choisir un candidat —</option>
          {candidats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.prenom} {c.nom}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="financementType">Financement</Label>
        <select
          id="financementType"
          className={selectClass}
          {...register("financementType")}
        >
          <option value="">Non précisé</option>
          {Object.entries(FINANCEMENT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="statut">Statut</Label>
        <select id="statut" className={selectClass} {...register("statut")}>
          {Object.entries(INSCRIPTION_STATUT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="montant">Montant (€)</Label>
        <Input id="montant" type="number" step="0.01" {...register("montant")} />
      </div>
      <div className="lg:col-span-4">
        <Button type="submit" disabled={isPending}>
          <UserPlus className="mr-2 h-4 w-4" />
          {isPending ? "Inscription…" : "Inscrire le candidat"}
        </Button>
      </div>
    </form>
  );
}
