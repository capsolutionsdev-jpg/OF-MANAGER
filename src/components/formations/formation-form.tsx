"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save } from "lucide-react";

import {
  formationFormSchema,
  type FormationFormValues,
  MODALITE_LABELS,
  ACADEMY_LABELS,
} from "@/lib/validators/formation";
import {
  createFormation,
  updateFormation,
} from "@/lib/actions/formation-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function FormationForm({
  formationId,
  defaultValues,
}: {
  formationId?: string;
  defaultValues?: Partial<FormationFormValues>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormationFormValues>({
    resolver: zodResolver(formationFormSchema),
    defaultValues: {
      titre: "",
      reference: "",
      certification: "",
      duree: "",
      dureeHeures: "",
      tarif: "",
      modalite: "MIXTE",
      academy: "",
      objectifs: "",
      programme: "",
      prerequis: "",
      publicVise: "",
      methodesPedagogiques: "",
      modalitesEvaluation: "",
      conditionsAcces: "",
      delaiAcces: "",
      piecesAttendues: "",
      examen: false,
      grilleInrs: "",
      ...defaultValues,
    },
  });

  function onSubmit(values: FormationFormValues) {
    startTransition(async () => {
      const res = formationId
        ? await updateFormation(formationId, values)
        : await createFormation(values);

      if (res.ok) {
        toast.success(formationId ? "Formation mise à jour." : "Formation créée.");
        router.push(`/formations/${res.id}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input id="titre" {...register("titre")} />
            <ErrorText msg={errors.titre?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reference">Référence *</Label>
            <Input id="reference" placeholder="WEB-001" {...register("reference")} />
            <ErrorText msg={errors.reference?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="certification">Certification (n° RS)</Label>
            <Input id="certification" placeholder="RS7076" {...register("certification")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="academy">Académie</Label>
            <select id="academy" className={selectClass} {...register("academy")}>
              <option value="">— Non classée —</option>
              {Object.entries(ACADEMY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="modalite">Modalité</Label>
            <select id="modalite" className={selectClass} {...register("modalite")}>
              {Object.entries(MODALITE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="duree">Durée (texte)</Label>
            <Input id="duree" placeholder="21h (14h dist. + 7h prés.)" {...register("duree")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dureeHeures">Durée (heures)</Label>
            <Input id="dureeHeures" type="number" placeholder="21" {...register("dureeHeures")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tarif">Tarif (€ HT)</Label>
            <Input id="tarif" type="number" step="0.01" placeholder="1500" {...register("tarif")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenu pédagogique</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="objectifs">Objectifs</Label>
            <Textarea id="objectifs" rows={3} {...register("objectifs")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="programme">Programme</Label>
            <Textarea id="programme" rows={5} {...register("programme")} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="prerequis">Prérequis</Label>
              <Textarea id="prerequis" rows={2} {...register("prerequis")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="publicVise">Public visé</Label>
              <Textarea id="publicVise" rows={2} {...register("publicVise")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="methodesPedagogiques">Méthodes pédagogiques</Label>
              <Textarea id="methodesPedagogiques" rows={2} {...register("methodesPedagogiques")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="modalitesEvaluation">Modalités d&apos;évaluation</Label>
              <Textarea id="modalitesEvaluation" rows={2} {...register("modalitesEvaluation")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accès &amp; dossier administratif</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="conditionsAcces">Conditions d&apos;accès</Label>
            <Textarea
              id="conditionsAcces"
              rows={3}
              placeholder="ex. Être majeur, savoir lire/écrire le français…"
              {...register("conditionsAcces")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="delaiAcces">Délai d&apos;accès</Label>
            <Input
              id="delaiAcces"
              placeholder="ex. Inscription jusqu'à 48h avant le démarrage"
              {...register("delaiAcces")}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="piecesAttendues">
              Pièces du dossier administratif{" "}
              <span className="font-normal text-muted-foreground">
                (une par ligne)
              </span>
            </Label>
            <Textarea
              id="piecesAttendues"
              rows={5}
              placeholder={"Carte nationale d'identité\nCV à jour\nJustificatif de domicile\nDernier diplôme obtenu"}
              {...register("piecesAttendues")}
            />
            <p className="text-xs text-muted-foreground">
              Ces pièces serviront de checklist pour le suivi du dossier de
              chaque candidat inscrit à cette formation.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border" {...register("examen")} />
              Formation soumise à un examen{" "}
              <span className="font-normal text-muted-foreground">
                (génère une convocation d&apos;examen ; à décocher pour SST / MAC SST / MAC APS)
              </span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">
              Grille de certification INRS (pré-remplie)
            </label>
            <select
              className="h-9 w-full max-w-sm rounded-md border bg-transparent px-3 text-sm"
              {...register("grilleInrs")}
            >
              <option value="">Aucune (pas de grille INRS)</option>
              <option value="SST">Grille SST (INRS)</option>
              <option value="MAC_SST">Grille MAC SST (INRS)</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Document officiel INRS pré-rempli (identité du stagiaire, dates, formateur) ;
              l&apos;évaluation des compétences reste à compléter par le formateur.
            </p>
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
