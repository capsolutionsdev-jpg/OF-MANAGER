"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save } from "lucide-react";

import {
  formateurFormSchema,
  type FormateurFormValues,
} from "@/lib/validators/formateur";
import {
  createFormateur,
  updateFormateur,
} from "@/lib/actions/formateur-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-sm text-destructive">{msg}</p>;
}

type FormationOption = { id: string; titre: string; academy: string | null };

export function FormateurForm({
  formateurId,
  formations,
  defaultValues,
}: {
  formateurId?: string;
  formations: FormationOption[];
  defaultValues?: Partial<FormateurFormValues>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormateurFormValues>({
    resolver: zodResolver(formateurFormSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      specialites: "",
      experienceAnnees: "",
      adresse: "",
      siret: "",
      tarifJournalier: "",
      academies: [],
      formationIds: [],
      ...defaultValues,
    },
  });

  function onSubmit(values: FormateurFormValues) {
    startTransition(async () => {
      const res = formateurId
        ? await updateFormateur(formateurId, values)
        : await createFormateur(values);
      if (res.ok) {
        toast.success(formateurId ? "Formateur mis à jour." : "Formateur créé.");
        router.push(`/formateurs/${res.id}`);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coordonnées</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="prenom">Prénom *</Label>
            <Input id="prenom" {...register("prenom")} />
            <ErrorText msg={errors.prenom?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" {...register("nom")} />
            <ErrorText msg={errors.nom?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            <ErrorText msg={errors.email?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" {...register("telephone")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="experienceAnnees">Expérience (années)</Label>
            <Input id="experienceAnnees" type="number" {...register("experienceAnnees")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="specialites">Spécialités</Label>
            <Input
              id="specialites"
              placeholder="Marketing digital, SEO, sécurité…"
              {...register("specialites")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Contrat de sous-traitance (facturation)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="adresse">Adresse (sous-traitant)</Label>
            <Input
              id="adresse"
              placeholder="N°, rue, code postal, ville"
              {...register("adresse")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input id="siret" placeholder="123 456 789 00012" {...register("siret")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tarifJournalier">Tarif journalier (€ HT)</Label>
            <Input
              id="tarifJournalier"
              type="number"
              step="0.01"
              placeholder="250"
              {...register("tarifJournalier")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Formations qu&apos;il peut animer</Label>
          {formations.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune formation au catalogue.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {formations.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    value={f.id}
                    {...register("formationIds")}
                    className="h-4 w-4"
                  />
                  <span className="truncate">{f.titre}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
