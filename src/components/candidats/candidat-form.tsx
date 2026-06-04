"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save } from "lucide-react";

import {
  candidatFormSchema,
  type CandidatFormValues,
  FINANCEMENT_LABELS,
  STATUT_LABELS,
  SOURCE_CONNAISSANCE_OPTIONS,
  DIPLOME_OPTIONS,
} from "@/lib/validators/candidat";
import { createCandidat, updateCandidat } from "@/lib/actions/candidat-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-sm text-destructive">{msg}</p>;
}

export function CandidatForm({
  candidatId,
  defaultValues,
  formations = [],
}: {
  candidatId?: string;
  defaultValues?: Partial<CandidatFormValues>;
  formations?: { id: string; titre: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CandidatFormValues>({
    resolver: zodResolver(candidatFormSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      dateNaissance: "",
      lieuNaissance: "",
      paysNaissance: "",
      adresse: "",
      ville: "",
      codePostal: "",
      pays: "France",
      situationPro: "",
      employeur: "",
      posteOccupe: "",
      dernierDiplome: "",
      sourceConnaissance: "",
      financementType: "",
      formationSouhaiteeId: "",
      statut: "NOUVEAU",
      ...defaultValues,
    },
  });

  function onSubmit(values: CandidatFormValues) {
    startTransition(async () => {
      const res = candidatId
        ? await updateCandidat(candidatId, values)
        : await createCandidat(values);

      if (res.ok) {
        toast.success(candidatId ? "Candidat mis à jour." : "Candidat créé.");
        router.push(`/candidats/${res.id}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informations personnelles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" {...register("nom")} />
            <ErrorText msg={errors.nom?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prenom">Prénom *</Label>
            <Input id="prenom" {...register("prenom")} />
            <ErrorText msg={errors.prenom?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register("email")} />
            <ErrorText msg={errors.email?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" {...register("telephone")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dateNaissance">Date de naissance</Label>
            <Input id="dateNaissance" type="date" {...register("dateNaissance")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lieuNaissance">Lieu de naissance</Label>
            <Input
              id="lieuNaissance"
              placeholder="Ville de naissance"
              {...register("lieuNaissance")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paysNaissance">Pays de naissance</Label>
            <Input
              id="paysNaissance"
              placeholder="France"
              {...register("paysNaissance")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" {...register("adresse")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="codePostal">Code postal</Label>
            <Input id="codePostal" {...register("codePostal")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ville">Ville</Label>
            <Input id="ville" {...register("ville")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pays">Pays</Label>
            <Input id="pays" {...register("pays")} />
          </div>
        </CardContent>
      </Card>

      {/* Informations professionnelles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Informations professionnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="situationPro">Situation professionnelle</Label>
            <Input
              id="situationPro"
              placeholder="Salarié, demandeur d'emploi…"
              {...register("situationPro")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="employeur">Employeur</Label>
            <Input id="employeur" {...register("employeur")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="posteOccupe">Poste occupé</Label>
            <Input id="posteOccupe" {...register("posteOccupe")} />
          </div>
          <div className="grid gap-2 sm:col-span-3">
            <Label htmlFor="dernierDiplome">Dernier diplôme obtenu</Label>
            <Input
              id="dernierDiplome"
              list="diplome-options"
              placeholder="Choisissez ou saisissez…"
              {...register("dernierDiplome")}
            />
            <datalist id="diplome-options">
              {DIPLOME_OPTIONS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
        </CardContent>
      </Card>

      {/* Financement & suivi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Financement & suivi</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="formationSouhaiteeId">Formation souhaitée</Label>
            <select
              id="formationSouhaiteeId"
              className={selectClass}
              {...register("formationSouhaiteeId")}
            >
              <option value="">— Non précisée —</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.titre}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="financementType">Financement envisagé</Label>
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
              {Object.entries(STATUT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="sourceConnaissance">
              Comment nous a-t-il connus ?
            </Label>
            <Input
              id="sourceConnaissance"
              list="source-options"
              placeholder="TikTok, Google, recommandation…"
              {...register("sourceConnaissance")}
            />
            <datalist id="source-options">
              {SOURCE_CONNAISSANCE_OPTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
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
