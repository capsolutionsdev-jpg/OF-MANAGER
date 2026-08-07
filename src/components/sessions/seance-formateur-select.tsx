"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setSeanceFormateur } from "@/lib/actions/emargement-actions";

/** Sélecteur de formateur pour UNE séance (formations longues : un formateur
 *  différent par jour). Enregistre au changement. */
export function SeanceFormateurSelect({
  seanceId,
  formateurId,
  formateurs,
}: {
  seanceId: string;
  formateurId: string | null;
  formateurs: { id: string; nom: string; prenom: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (formateurs.length === 0) return null;

  return (
    <select
      defaultValue={formateurId ?? ""}
      disabled={pending}
      onChange={(e) => {
        const val = e.target.value;
        start(async () => {
          await setSeanceFormateur(seanceId, val);
          toast.success("Formateur de la séance mis à jour.");
          router.refresh();
        });
      }}
      className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
      aria-label="Formateur de la séance"
      title="Formateur de cette séance"
    >
      <option value="">— Formateur —</option>
      {formateurs.map((f) => (
        <option key={f.id} value={f.id}>
          {f.prenom} {f.nom}
        </option>
      ))}
    </select>
  );
}
