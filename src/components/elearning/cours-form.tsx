"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Academy } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACADEMY_LABELS, ACADEMY_ORDER } from "@/lib/validators/formation";
import { type CoursFormValues } from "@/lib/validators/cours";
import { createCours, updateCours } from "@/lib/actions/cours-actions";

const sx =
  "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function CoursForm({
  coursId,
  formations,
  defaultValues,
}: {
  coursId?: string;
  formations: { id: string; titre: string; academy: Academy | null }[];
  defaultValues?: Partial<CoursFormValues>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [v, setV] = useState<CoursFormValues>({
    titre: defaultValues?.titre ?? "",
    academy: (defaultValues?.academy as Academy) ?? "DIGITAL",
    formationId: defaultValues?.formationId ?? "",
    description: defaultValues?.description ?? "",
    niveau: defaultValues?.niveau ?? "",
    imageUrl: defaultValues?.imageUrl ?? "",
    isPublished: defaultValues?.isPublished ?? false,
  });

  const set = <K extends keyof CoursFormValues>(k: K, val: CoursFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  // Formations filtrées par academy sélectionnée
  const formationsAcademy = useMemo(
    () => formations.filter((f) => f.academy === v.academy),
    [formations, v.academy],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.titre.trim()) {
      toast.error("Indiquez un titre.");
      return;
    }
    startTransition(async () => {
      const res = coursId
        ? await updateCours(coursId, v)
        : await createCours(v);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success(coursId ? "Cours mis à jour." : "Cours créé.");
      const id = coursId ?? (res as { id: string }).id;
      router.push(`/elearning/${id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="titre">Titre du cours *</Label>
        <Input
          id="titre"
          value={v.titre}
          onChange={(e) => set("titre", e.target.value)}
          placeholder="Ex. SEO : les fondamentaux"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="academy">Domaine *</Label>
          <select
            id="academy"
            className={sx}
            value={v.academy}
            onChange={(e) => {
              set("academy", e.target.value as Academy);
              set("formationId", "");
            }}
          >
            {ACADEMY_ORDER.map((a) => (
              <option key={a} value={a}>
                {ACADEMY_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="formationId">Formation rattachée</Label>
          <select
            id="formationId"
            className={sx}
            value={v.formationId}
            onChange={(e) => set("formationId", e.target.value)}
          >
            <option value="">— Aucune (cours libre du domaine) —</option>
            {formationsAcademy.map((f) => (
              <option key={f.id} value={f.id}>
                {f.titre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          className="min-h-[80px] w-full rounded-md border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="À qui s'adresse ce cours, objectifs…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="niveau">Niveau</Label>
          <Input
            id="niveau"
            value={v.niveau}
            onChange={(e) => set("niveau", e.target.value)}
            placeholder="Débutant, B1…"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="imageUrl">Image de couverture (URL)</Label>
          <Input
            id="imageUrl"
            value={v.imageUrl}
            onChange={(e) => set("imageUrl", e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={!!v.isPublished}
          onChange={(e) => set("isPublished", e.target.checked)}
        />
        Publier le cours (visible par les élèves inscrits)
      </label>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button type="submit" disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
