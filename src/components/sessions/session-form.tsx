"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save } from "lucide-react";

import {
  sessionFormSchema,
  type SessionFormValues,
  SESSION_STATUT_LABELS,
} from "@/lib/validators/session";
import { MODALITE_LABELS } from "@/lib/validators/formation";
import { createSession, updateSession } from "@/lib/actions/session-actions";
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

const ACA_SHORT: Record<string, string> = {
  DIGITAL: "Digital",
  SAFETY: "Safety",
  TRANSPORT: "Transport",
  LANGUE: "Langues",
};

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-sm text-destructive">{msg}</p>;
}

type FormationOption = { id: string; titre: string; reference: string };

export function SessionForm({
  formations,
  formateurs = [],
  sessionId,
  defaultValues,
}: {
  formations: FormationOption[];
  formateurs?: { id: string; nom: string; prenom: string; academies?: string[] }[];
  sessionId?: string;
  defaultValues?: Partial<SessionFormValues>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      formationId: "",
      reference: "",
      dateDebut: "",
      dateFin: "",
      horaires: "",
      lieu: "",
      modalite: "MIXTE",
      nbPlaces: "10",
      statut: "PLANIFIEE",
      tarifFormateurJour: "",
      formateurIds: [],
      ...defaultValues,
    },
  });

  function onSubmit(values: SessionFormValues) {
    startTransition(async () => {
      const res = sessionId
        ? await updateSession(sessionId, values)
        : await createSession(values);

      if (res.ok) {
        toast.success(sessionId ? "Session mise à jour." : "Session créée.");
        router.push(`/sessions/${res.id}`);
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
          <CardTitle className="text-base">Planification</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="formationId">Formation *</Label>
            <select
              id="formationId"
              className={selectClass}
              {...register("formationId")}
            >
              <option value="">— Choisir une formation —</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.titre} ({f.reference})
                </option>
              ))}
            </select>
            <ErrorText msg={errors.formationId?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dateDebut">Date de début *</Label>
            <Input id="dateDebut" type="date" {...register("dateDebut")} />
            <ErrorText msg={errors.dateDebut?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dateFin">Date de fin *</Label>
            <Input id="dateFin" type="date" {...register("dateFin")} />
            <ErrorText msg={errors.dateFin?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="horaires">Horaires</Label>
            <Input
              id="horaires"
              placeholder="9h-12h30 / 13h30-17h"
              {...register("horaires")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lieu">Lieu</Label>
            <Input
              id="lieu"
              placeholder="Les Lilas (93) ou 100% en ligne"
              {...register("lieu")}
            />
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
            <Label htmlFor="nbPlaces">Nombre de places</Label>
            <Input id="nbPlaces" type="number" {...register("nbPlaces")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reference">Référence (optionnel)</Label>
            <Input id="reference" placeholder="SES-SEO-2026-01" {...register("reference")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tarifFormateurJour">
              Tarif formateur / jour (€ HT)
            </Label>
            <Input
              id="tarifFormateurJour"
              type="number"
              step="0.01"
              placeholder="ex. 250 (sinon tarif du formateur)"
              {...register("tarifFormateurJour")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="statut">Statut</Label>
            <select id="statut" className={selectClass} {...register("statut")}>
              {Object.entries(SESSION_STATUT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label>Formateur(s) affecté(s)</Label>
            {formateurs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun formateur enregistré. Ajoutez-en dans la section « Formateurs ».
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {formateurs.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      value={f.id}
                      {...register("formateurIds")}
                      className="h-4 w-4"
                    />
                    <span className="flex-1">
                      {f.prenom} {f.nom}
                      {f.academies && f.academies.length > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({f.academies.map((a) => ACA_SHORT[a] ?? a).join(", ")})
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
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
