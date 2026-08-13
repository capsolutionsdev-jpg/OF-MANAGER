"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Trash2 } from "lucide-react";
import type { DossierFinancementEtat } from "@prisma/client";
import { setDossierEtat, deleteDossier } from "@/lib/actions/opco-actions";

const ETATS: { v: DossierFinancementEtat; label: string }[] = [
  { v: "A_MONTER", label: "À monter" },
  { v: "EN_COURS", label: "En cours" },
  { v: "ACCEPTE", label: "Accepté" },
  { v: "REFUSE", label: "Refusé" },
  { v: "A_FACTURER", label: "À facturer" },
  { v: "FACTURE", label: "Facturé" },
  { v: "SOLDE", label: "Soldé" },
  { v: "ANNULE", label: "Annulé" },
];

/** Actions sur un dossier OPCO : changer l'état, télécharger le bordereau, supprimer. */
export function OpcoDossierActions({ id, etat }: { id: string; etat: DossierFinancementEtat }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function changeEtat(v: DossierFinancementEtat) {
    start(async () => {
      const r = await setDossierEtat(id, v);
      if (r.ok) router.refresh();
      else toast.error(r.error ?? "Échec.");
    });
  }
  function supprimer() {
    start(async () => {
      const r = await deleteDossier(id);
      if (r.ok) { toast.success("Dossier supprimé."); router.refresh(); }
      else toast.error(r.error ?? "Échec.");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="h-8 rounded-md border bg-background px-2 text-xs"
        value={etat}
        disabled={pending}
        onChange={(e) => changeEtat(e.target.value as DossierFinancementEtat)}
      >
        {ETATS.map((e) => <option key={e.v} value={e.v}>{e.label}</option>)}
      </select>
      <a
        href={`/api/financements/${id}/bordereau`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs hover:bg-muted"
        title="Bordereau de prise en charge (PDF)"
      >
        <FileText className="h-3.5 w-3.5" /> Bordereau
      </a>
      <button
        type="button"
        onClick={supprimer}
        disabled={pending}
        className="inline-flex h-8 items-center rounded-md border px-2 text-xs text-red-600 hover:bg-red-50"
        title="Supprimer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
