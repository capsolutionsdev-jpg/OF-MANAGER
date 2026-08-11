"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Gavel, Save } from "lucide-react";

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

type FormationOption = { id: string; titre: string; reference: string; soumisJury?: boolean; nbJury?: number | null; examen?: boolean; academy?: string | null };
type JuryOption = { id: string; nom: string; prenom: string; qualite: string | null; formationsValidables: string[]; actif: boolean };
type JurySel = { juryId: string; prixEuros: string; natureExamen: string };

export function SessionForm({
  formations,
  formateurs = [],
  salles = [],
  jurys = [],
  sessionId,
  defaultValues,
  defaultLieu = "",
}: {
  formations: FormationOption[];
  formateurs?: { id: string; nom: string; prenom: string; academies?: string[]; typeContrat?: string }[];
  salles?: { id: string; nom: string }[];
  jurys?: JuryOption[];
  sessionId?: string;
  defaultValues?: Partial<SessionFormValues>;
  /** Adresse du centre — pré-remplit le lieu (et le lieu d'examen sécurité) en création (#15). */
  defaultLieu?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Sélection des jurés (hors react-hook-form : prix + nature par juré).
  const [jurySel, setJurySel] = useState<JurySel[]>(
    (defaultValues?.jurys ?? []).map((j) => ({
      juryId: j.juryId,
      prixEuros: j.prixEuros ?? "",
      natureExamen: j.natureExamen ?? "",
    })),
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      formationId: "",
      reference: "",
      dateDebut: "",
      dateFin: "",
      horaires: "",
      lieu: defaultLieu,
      dateExamen: "",
      lieuExamen: "",
      salleId: "",
      modalite: "PRESENTIEL",
      nbPlaces: "12",
      statut: "PLANIFIEE",
      tarifFormateurJour: "",
      formateurIds: [],
      ...defaultValues,
    },
  });

  const watchedFormationId = watch("formationId");
  const selectedFormation = formations.find((f) => f.id === watchedFormationId);
  const juryActif = !!selectedFormation?.soumisJury;
  // La formation est-elle sanctionnée par un examen ? (masque date/lieu d'examen sinon)
  const examenActif = !!selectedFormation?.examen;

  // Lieu d'examen par défaut selon la catégorie, en CRÉATION et si le champ est
  // vide : sécurité privée → adresse du centre ; SSIAP / VTC-Taxi → laissé libre
  // (SSIAP = centre d'examen dédié ; VTC/Taxi = géré par la CMA).
  useEffect(() => {
    if (sessionId || !examenActif || !defaultLieu) return;
    if (getValues("lieuExamen")?.trim()) return;
    const isSsiap = /ssiap/i.test(`${selectedFormation?.reference ?? ""} ${selectedFormation?.titre ?? ""}`);
    if (selectedFormation?.academy === "SAFETY" && !isSsiap) {
      setValue("lieuExamen", defaultLieu, { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedFormationId]);

  // Jurés pouvant valider cette formation (ou sans restriction).
  const jurysEligibles = jurys.filter(
    (j) => j.actif && (j.formationsValidables.length === 0 || j.formationsValidables.includes(watchedFormationId)),
  );
  const isSel = (juryId: string) => jurySel.some((s) => s.juryId === juryId);
  const toggleJury = (juryId: string) =>
    setJurySel((c) =>
      isSel(juryId) ? c.filter((s) => s.juryId !== juryId) : [...c, { juryId, prixEuros: "", natureExamen: "" }],
    );
  const patchJury = (juryId: string, patch: Partial<JurySel>) =>
    setJurySel((c) => c.map((s) => (s.juryId === juryId ? { ...s, ...patch } : s)));

  function onSubmit(values: SessionFormValues) {
    // On n'envoie les jurés QUE si la formation est soumise à jury.
    const payload: SessionFormValues = { ...values, jurys: juryActif ? jurySel : [] };
    startTransition(async () => {
      const res = sessionId
        ? await updateSession(sessionId, payload)
        : await createSession(payload);

      if (res.ok) {
        toast.success(sessionId ? "Session mise à jour." : "Session créée.");
        if (res.warning) toast.warning(res.warning);
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
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="lieu">Lieu de la formation</Label>
            <Input
              id="lieu"
              placeholder="Adresse de la formation"
              {...register("lieu")}
            />
            <p className="text-xs text-muted-foreground">
              Adresse du centre par défaut — modifiez-la pour une formation sur un autre site (en entreprise / extra).
            </p>
          </div>
          {examenActif && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="dateExamen">Date d&apos;examen</Label>
                <Input id="dateExamen" type="date" {...register("dateExamen")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lieuExamen">Lieu d&apos;examen</Label>
                <Input id="lieuExamen" placeholder="Adresse du centre d'examen" {...register("lieuExamen")} />
              </div>
            </>
          )}

          {salles.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="salleId">Salle</Label>
              <select id="salleId" className={selectClass} {...register("salleId")}>
                <option value="">— Aucune —</option>
                {salles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {/* Référence retirée du formulaire (#15) — conservée en base : champ caché
              pour ne pas effacer la référence d'une session existante en édition. */}
          <input type="hidden" {...register("reference")} />
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
                      {f.typeContrat && (
                        <span
                          className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            f.typeContrat === "INTERNE"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {f.typeContrat === "INTERNE" ? "Interne" : "Externe (contrat)"}
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

      {/* Jury d'examen — visible seulement si la formation est soumise à jury */}
      {juryActif && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gavel className="h-4 w-4 text-primary" /> Jury d&apos;examen
              {selectedFormation?.nbJury ? (
                <span className="text-xs font-normal text-muted-foreground">
                  ({selectedFormation.nbJury} juré{selectedFormation.nbJury > 1 ? "s" : ""} attendu{selectedFormation.nbJury > 1 ? "s" : ""})
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {jurysEligibles.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun juré disponible pour cette formation. Ajoutez des jurés (et cochez les
                formations qu&apos;ils peuvent valider) dans la section « Jurys ».
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Cochez le(s) juré(s), puis renseignez le défraiement (personnalisé) et la nature de l&apos;examen.
                </p>
                {jurysEligibles.map((j) => {
                  const sel = jurySel.find((s) => s.juryId === j.id);
                  const on = !!sel;
                  return (
                    <div key={j.id} className="rounded-lg border p-2.5">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="h-4 w-4" checked={on} onChange={() => toggleJury(j.id)} />
                        <span className="font-medium">{j.prenom} {j.nom}</span>
                        {j.qualite && <span className="text-xs text-muted-foreground">— {j.qualite}</span>}
                      </label>
                      {on && (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <Input placeholder="Défraiement (€)" inputMode="decimal"
                            value={sel!.prixEuros} onChange={(e) => patchJury(j.id, { prixEuros: e.target.value })} />
                          <Input placeholder="Nature de l'examen"
                            value={sel!.natureExamen} onChange={(e) => patchJury(j.id, { natureExamen: e.target.value })} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </CardContent>
        </Card>
      )}

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
