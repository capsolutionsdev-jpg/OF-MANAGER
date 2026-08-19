"use client";

import { useState, useTransition, useEffect } from "react";
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
  CNAPS_STATUT_LABELS,
  SOURCE_CONNAISSANCE_OPTIONS,
  DIPLOME_OPTIONS,
} from "@/lib/validators/candidat";
import { createCandidat, updateCandidat } from "@/lib/actions/candidat-actions";
import { PAYS_NOMS, NATIONALITES } from "@/lib/data/pays";
import { DEPARTEMENTS } from "@/lib/data/departements";
import { SITUATIONS_PRO, SITUATION_AUTRE } from "@/lib/data/situations-pro";
import { formationPrereq } from "@/lib/inscription/prerequis";
import type { SessionOption } from "@/components/inscriptions/quick-enroll-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-sm text-destructive">{msg}</p>;
}

type FormationOption = { id: string; titre: string; reference?: string | null };

export function CandidatForm({
  candidatId,
  defaultValues,
  formations = [],
  collaborateurs = [],
  sessions = [],
}: {
  candidatId?: string;
  defaultValues?: Partial<CandidatFormValues>;
  formations?: FormationOption[];
  collaborateurs?: { id: string; name: string }[];
  /** Sessions à venir (pour rattacher directement le candidat — #1). */
  sessions?: SessionOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Situation professionnelle : liste + « Autre » (champ libre).
  const dvSituation = defaultValues?.situationPro ?? "";
  const initSituation = dvSituation
    ? SITUATIONS_PRO.includes(dvSituation)
      ? dvSituation
      : SITUATION_AUTRE
    : "";
  const [situationAutre, setSituationAutre] = useState(
    dvSituation && !SITUATIONS_PRO.includes(dvSituation) ? dvSituation : "",
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
      departementNaissance: "",
      paysNaissance: "",
      nationalite: "",
      adresse: "",
      ville: "",
      codePostal: "",
      pays: "France",
      employeur: "",
      posteOccupe: "",
      dernierDiplome: "",
      sourceConnaissance: "",
      assignedToId: "",
      financementType: "",
      formationSouhaiteeId: "",
      sessionId: "",
      statut: "NOUVEAU",
      cnapsStatut: "",
      carteProNumero: "",
      carteProValidite: "",
      ssiapNiveau: "",
      ssiapDiplomeNumero: "",
      ssiapDiplomeDate: "",
      situationHandicap: false,
      besoinsAdaptation: "",
      ...defaultValues,
      situationPro: initSituation,
    },
  });

  // Prérequis conditionnels selon la formation souhaitée.
  const formationId = watch("formationSouhaiteeId");
  const situationPro = watch("situationPro");
  const selectedFormation = formations.find((f) => f.id === formationId);
  const prereq = selectedFormation ? formationPrereq(selectedFormation) : {};
  const showCnaps = !!(prereq.cnaps || prereq.carteProAlternative);
  const showSsiap = !!prereq.ssiap;
  // Libellés du bloc CNAPS selon le type de formation :
  // - formation initiale (TFP APS, APS initial…) → le candidat détient une
  //   AUTORISATION PRÉALABLE, pas encore de carte professionnelle ;
  // - recyclage / A3P / vidéoprotection (carte pro acceptée EN ALTERNATIVE, cf.
  //   prereq.carteProAlternative) → on garde les libellés « carte professionnelle ».
  const carteProAcceptee = !!prereq.carteProAlternative;
  const cnapsNumeroLabel = carteProAcceptee ? "N° carte professionnelle" : "N° autorisation préalable";
  const cnapsNumeroPlaceholder = carteProAcceptee ? "CAR-…" : "";
  const cnapsValiditeLabel = carteProAcceptee ? "Validité carte pro" : "Validité autorisation";

  // Sessions à venir de la formation choisie (rattachement direct — #1).
  const sessionsPourFormation = sessions.filter((s) => s.formationId === formationId);
  // Réinitialise la session choisie quand la formation change.
  useEffect(() => {
    setValue("sessionId", "");
  }, [formationId, setValue]);

  function onSubmit(values: CandidatFormValues) {
    // « Autre » → reporte le texte libre dans situationPro.
    const payload: CandidatFormValues = { ...values };
    if (values.situationPro === SITUATION_AUTRE) {
      payload.situationPro = situationAutre.trim() || SITUATION_AUTRE;
    }
    startTransition(async () => {
      const res = candidatId
        ? await updateCandidat(candidatId, payload)
        : await createCandidat(payload);
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
            <Label htmlFor="nationalite">Nationalité</Label>
            <select id="nationalite" className={selectClass} {...register("nationalite")}>
              <option value="">— Sélectionner —</option>
              {NATIONALITES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paysNaissance">Pays de naissance</Label>
            <select id="paysNaissance" className={selectClass} {...register("paysNaissance")}>
              <option value="">— Sélectionner —</option>
              {PAYS_NOMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="departementNaissance">Département de naissance</Label>
            <select id="departementNaissance" className={selectClass} {...register("departementNaissance")}>
              <option value="">— Sélectionner —</option>
              {DEPARTEMENTS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} — {d.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lieuNaissance">Commune de naissance</Label>
            <Input id="lieuNaissance" placeholder="Commune / ville de naissance" {...register("lieuNaissance")} />
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
            <select id="pays" className={selectClass} {...register("pays")}>
              {PAYS_NOMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Informations professionnelles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations professionnelles</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="situationPro">Situation professionnelle</Label>
            <select id="situationPro" className={selectClass} {...register("situationPro")}>
              <option value="">— Sélectionner —</option>
              {SITUATIONS_PRO.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {situationPro === SITUATION_AUTRE && (
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="situationAutre">Préciser la situation</Label>
              <Input
                id="situationAutre"
                value={situationAutre}
                onChange={(e) => setSituationAutre(e.target.value)}
                placeholder="Décrivez la situation professionnelle…"
              />
            </div>
          )}
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
            <Input id="dernierDiplome" list="diplome-options" placeholder="Choisissez ou saisissez…" {...register("dernierDiplome")} />
            <datalist id="diplome-options">
              {DIPLOME_OPTIONS.map((d) => (<option key={d} value={d} />))}
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
            <select id="formationSouhaiteeId" className={selectClass} {...register("formationSouhaiteeId")}>
              <option value="">— Non précisée —</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>{f.titre}</option>
              ))}
            </select>
          </div>
          {formationId && (
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="sessionId">Session (rattachement direct)</Label>
              {sessionsPourFormation.length > 0 ? (
                <select id="sessionId" className={selectClass} {...register("sessionId")}>
                  <option value="">— Ne pas rattacher tout de suite —</option>
                  {sessionsPourFormation.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune session à venir pour cette formation — vous pourrez rattacher le candidat plus tard depuis la session.
                </p>
              )}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="financementType">Financement envisagé</Label>
            <select id="financementType" className={selectClass} {...register("financementType")}>
              <option value="">Non précisé</option>
              {Object.entries(FINANCEMENT_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="statut">Statut</Label>
            <select id="statut" className={selectClass} {...register("statut")}>
              {Object.entries(STATUT_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sourceConnaissance">Comment nous a-t-il connus ?</Label>
            <select id="sourceConnaissance" className={selectClass} {...register("sourceConnaissance")}>
              <option value="">— Sélectionner —</option>
              {SOURCE_CONNAISSANCE_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assignedToId">Suivi par (collaborateur)</Label>
            <select id="assignedToId" className={selectClass} {...register("assignedToId")}>
              <option value="">— Non attribué —</option>
              {collaborateurs.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Sécurité privée (CNAPS) — affiché seulement si la formation le requiert */}
      {showCnaps && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sécurité privée (CNAPS)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="cnapsStatut">Autorisation préalable CNAPS</Label>
              <select id="cnapsStatut" className={selectClass} {...register("cnapsStatut")}>
                <option value="">— À renseigner —</option>
                {Object.entries(CNAPS_STATUT_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="carteProNumero">{cnapsNumeroLabel}</Label>
              <Input id="carteProNumero" placeholder={cnapsNumeroPlaceholder} {...register("carteProNumero")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="carteProValidite">{cnapsValiditeLabel}</Label>
              <Input id="carteProValidite" type="date" {...register("carteProValidite")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diplôme SSIAP — affiché seulement pour un recyclage / remise à niveau SSIAP */}
      {showSsiap && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diplôme SSIAP {prereq.ssiap?.niveau} détenu (recyclage / remise à niveau)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="ssiapNiveau">Niveau du diplôme</Label>
              <select id="ssiapNiveau" className={selectClass} {...register("ssiapNiveau")}>
                <option value="">— Non concerné —</option>
                <option value="1">SSIAP 1</option>
                <option value="2">SSIAP 2</option>
                <option value="3">SSIAP 3</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ssiapDiplomeNumero">N° du diplôme</Label>
              <Input id="ssiapDiplomeNumero" placeholder="091-9119-1-2018-00246" {...register("ssiapDiplomeNumero")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ssiapDiplomeDate">Date d&apos;obtention</Label>
              <Input id="ssiapDiplomeDate" type="date" {...register("ssiapDiplomeDate")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accessibilité */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accessibilité (handicap)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 rounded border" {...register("situationHandicap")} />
            Situation de handicap déclarée
          </label>
          <div className="grid gap-2">
            <Label htmlFor="besoinsAdaptation">Besoins d&apos;adaptation pédagogique</Label>
            <textarea
              id="besoinsAdaptation"
              rows={3}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              placeholder="Aménagements nécessaires (matériel, temps majoré, accompagnement…). Le référent handicap est contacté si besoin."
              {...register("besoinsAdaptation")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
        <Button type="submit" disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
