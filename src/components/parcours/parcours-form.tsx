"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { PhotoCapture } from "@/components/parcours/photo-capture";
import {
  submitParcoursForm,
  type ParcoursFormValues,
} from "@/lib/actions/parcours-actions";

const sx =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ParcoursForm({
  token,
  defaults,
}: {
  token: string;
  defaults: Partial<ParcoursFormValues>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [v, setV] = useState<ParcoursFormValues>({
    telephone: defaults.telephone ?? "",
    dateNaissance: defaults.dateNaissance ?? "",
    adresse: defaults.adresse ?? "",
    codePostal: defaults.codePostal ?? "",
    ville: defaults.ville ?? "",
    situationPro: defaults.situationPro ?? "",
    employeur: defaults.employeur ?? "",
    financementType: defaults.financementType ?? "",
    photoDataUrl: defaults.photoDataUrl ?? "",
    consent: false,
  });

  const set = (k: keyof ParcoursFormValues, val: string | boolean) =>
    setV((p) => ({ ...p, [k]: val }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.photoDataUrl) {
      toast.error("Merci d'ajouter votre photo d'identité (choisir ou prendre une photo).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!v.consent) {
      toast.error("Merci de cocher le consentement RGPD.");
      return;
    }
    startTransition(async () => {
      const res = await submitParcoursForm(token, v);
      if (res.ok) {
        toast.success("Informations enregistrées. Merci !");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PhotoCapture
        required
        value={v.photoDataUrl || undefined}
        onChange={(dataUrl) =>
          setV((p) => ({ ...p, photoDataUrl: dataUrl ?? "" }))
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input
            id="telephone"
            value={v.telephone}
            onChange={(e) => set("telephone", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dateNaissance">Date de naissance</Label>
          <Input
            id="dateNaissance"
            type="date"
            value={v.dateNaissance}
            onChange={(e) => set("dateNaissance", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="adresse">Adresse</Label>
          <Input
            id="adresse"
            value={v.adresse}
            onChange={(e) => set("adresse", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="codePostal">Code postal</Label>
          <Input
            id="codePostal"
            value={v.codePostal}
            onChange={(e) => set("codePostal", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ville">Ville</Label>
          <Input
            id="ville"
            value={v.ville}
            onChange={(e) => set("ville", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="situationPro">Situation professionnelle</Label>
          <Input
            id="situationPro"
            placeholder="Salarié, demandeur d'emploi…"
            value={v.situationPro}
            onChange={(e) => set("situationPro", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="employeur">Employeur (le cas échéant)</Label>
          <Input
            id="employeur"
            value={v.employeur}
            onChange={(e) => set("employeur", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="financementType">Mode de financement</Label>
          <select
            id="financementType"
            className={sx}
            value={v.financementType}
            onChange={(e) => set("financementType", e.target.value)}
          >
            <option value="">À préciser</option>
            {Object.entries(FINANCEMENT_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={v.consent}
          onChange={(e) => set("consent", e.target.checked)}
        />
        <span>
          J&apos;atteste l&apos;exactitude des informations fournies et
          j&apos;accepte leur traitement dans le cadre de ma formation (RGPD). *
        </span>
      </label>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement…" : "Valider mes informations"}
      </Button>
    </form>
  );
}
