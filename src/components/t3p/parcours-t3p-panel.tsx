"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  AlertTriangle,
  CarTaxiFront,
  Check,
  CircleDashed,
  FileDown,
  Info,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import {
  T3P_MAX_TENTATIVES_PRATIQUE,
  T3P_METIER_LABELS,
  T3P_RESULTAT_LABELS,
  T3P_STATUT_LABELS,
  alertePrincipale,
  epreuvesDuType,
  etapeCourante,
  etapesValidees,
  parcoursEtapes,
  peutAnnulerEtape,
  peutValiderEtape,
  progression,
  tentativesPratiqueConsommees,
  theorieAdmise,
  type ParcoursT3PComplet,
  type T3PAlerte,
  type T3PEpreuveLike,
  type T3PEtape,
} from "@/lib/t3p";
import {
  ajouterEpreuveT3P,
  annulerValidationEtapeT3P,
  majEpreuveT3P,
  majParcoursT3P,
  supprimerEpreuveT3P,
  validerEtapeT3P,
  type ParcoursT3PPatch,
} from "@/lib/actions/t3p-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

/** Parcours sérialisé pour le client (Decimal → chaîne). */
export type ParcoursDto = ParcoursT3PComplet & {
  fraisMontant: string | null;
  inscription: { id: string; session: { id: string; formation: { titre: string } } } | null;
};

const toInput = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const fmt = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

function AlerteBanner({ alerte }: { alerte: T3PAlerte }) {
  const styles = {
    danger: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    info: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  } as const;
  const Icon = alerte.niveau === "info" ? Info : AlertTriangle;
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${styles[alerte.niveau]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{alerte.message}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Ligne d'épreuve (une présentation CMA) — édition inline
// ─────────────────────────────────────────────────────────────

function EpreuveRow({ epreuve }: { epreuve: T3PEpreuveLike }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [convoc, setConvoc] = useState(toInput(epreuve.convocationRecueLe));
  const [date, setDate] = useState(toInput(epreuve.date));
  const [resultat, setResultat] = useState<string>(epreuve.resultat);
  const [resultatLe, setResultatLe] = useState(toInput(epreuve.resultatLe));
  const [note, setNote] = useState(epreuve.note ?? "");

  function save() {
    startTransition(async () => {
      const res = await majEpreuveT3P(epreuve.id, {
        convocationRecueLe: convoc,
        date,
        resultat: resultat as "EN_ATTENTE" | "ADMIS" | "AJOURNE" | "ABSENT",
        resultatLe,
        note,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Présentation enregistrée.");
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Supprimer cette présentation (saisie par erreur) ?")) return;
    startTransition(async () => {
      const res = await supprimerEpreuveT3P(epreuve.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Présentation supprimée.");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-2 items-end gap-2 rounded-lg border p-2 sm:grid-cols-3 lg:grid-cols-7">
      <div className="text-sm font-medium">
        Présentation n°{epreuve.tentative}
        {epreuve.resultat !== "EN_ATTENTE" && (
          <Badge variant="secondary" className="ml-2">
            {T3P_RESULTAT_LABELS[epreuve.resultat]}
          </Badge>
        )}
      </div>
      <div className="grid gap-1">
        <Label className="text-xs">Convocation reçue</Label>
        <Input type="date" className="h-8" value={convoc} onChange={(e) => setConvoc(e.target.value)} />
      </div>
      <div className="grid gap-1">
        <Label className="text-xs">Date de l&apos;épreuve</Label>
        <Input type="date" className="h-8" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="grid gap-1">
        <Label className="text-xs">Résultat</Label>
        <select className={selectClass} value={resultat} onChange={(e) => setResultat(e.target.value)}>
          {Object.entries(T3P_RESULTAT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label className="text-xs">Résultat publié le</Label>
        <Input type="date" className="h-8" value={resultatLe} onChange={(e) => setResultatLe(e.target.value)} />
      </div>
      <div className="grid gap-1">
        <Label className="text-xs">Note</Label>
        <Input className="h-8" placeholder="14/20" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex gap-1">
        <Button size="sm" onClick={save} disabled={isPending}>
          Enregistrer
        </Button>
        <Button size="sm" variant="ghost" onClick={remove} disabled={isPending} aria-label="Supprimer">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Panneau principal du parcours
// ─────────────────────────────────────────────────────────────

export function ParcoursT3PPanel({ parcours }: { parcours: ParcoursDto }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const taxi = parcours.metier === "TAXI";

  const etapes = parcoursEtapes(parcours);
  const courante = etapeCourante(etapes);
  const alerte = alertePrincipale(etapes);
  const { faites, total } = progression(etapes);
  const { validees } = etapesValidees(etapes);
  const thAdmise = theorieAdmise(parcours);
  const tentativesPratique = tentativesPratiqueConsommees(parcours);

  // États des sections de saisie.
  const [s1, setS1] = useState({
    permisBDate: toInput(parcours.permisBDate),
    conduiteAccompagnee: parcours.conduiteAccompagnee,
    permisVerifieLe: toInput(parcours.permisVerifieLe),
    casierVerifieLe: toInput(parcours.casierVerifieLe),
    psc1VerifieLe: toInput(parcours.psc1VerifieLe),
    medicalDate: toInput(parcours.medicalDate),
    medicalVerifieLe: toInput(parcours.medicalVerifieLe),
    dossierCompletLe: toInput(parcours.dossierCompletLe),
  });
  const [s2, setS2] = useState({
    cmaDepartement: parcours.cmaDepartement ?? "",
    cmaNumeroDossier: parcours.cmaNumeroDossier ?? "",
    cmaInscritLe: toInput(parcours.cmaInscritLe),
  });
  const [s3, setS3] = useState({
    fraisMontant: parcours.fraisMontant ?? "",
    fraisPayesLe: toInput(parcours.fraisPayesLe),
    fraisAvancesParOF: parcours.fraisAvancesParOF,
  });
  const [sf, setSf] = useState({
    formationTheoriqueFaiteLe: toInput(parcours.formationTheoriqueFaiteLe),
    formationPratiqueFaiteLe: toInput(parcours.formationPratiqueFaiteLe),
  });
  const [s11, setS11] = useState({
    carteProDemandeeLe: toInput(parcours.carteProDemandeeLe),
    carteProObtenueLe: toInput(parcours.carteProObtenueLe),
    carteProNumero: parcours.carteProNumero ?? "",
  });
  const [suivi, setSuivi] = useState({
    statut: parcours.statut as string,
    admissibiliteLe: toInput(parcours.admissibiliteLe),
    commentaire: parcours.commentaire ?? "",
  });

  function save(patch: ParcoursT3PPatch, message = "Parcours mis à jour.") {
    startTransition(async () => {
      const res = await majParcoursT3P(parcours.id, patch);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(message);
      router.refresh();
    });
  }

  function addEpreuve(type: "THEORIE" | "PRATIQUE") {
    startTransition(async () => {
      const res = await ajouterEpreuveT3P(parcours.id, type);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Nouvelle présentation ouverte.");
      router.refresh();
    });
  }

  function validerEtape(etape: T3PEtape) {
    startTransition(async () => {
      const res = await validerEtapeT3P(parcours.id, etape.key);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Étape « ${etape.label} » validée.`);
      router.refresh();
    });
  }

  function annulerEtape(etape: T3PEtape) {
    startTransition(async () => {
      const res = await annulerValidationEtapeT3P(parcours.id, etape.key);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Validation annulée.");
      router.refresh();
    });
  }

  const statutBadge =
    parcours.statut === "REUSSI"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : parcours.statut === "ABANDONNE"
        ? "bg-red-500/10 text-red-700 dark:text-red-300"
        : "bg-sky-500/10 text-sky-700 dark:text-sky-300";

  return (
    <div className="space-y-6">
      {/* ── En-tête du parcours ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CarTaxiFront className="h-4 w-4 text-primary" />
              Parcours d&apos;accès {T3P_METIER_LABELS[parcours.metier]} — examen CMA
              {parcours.mobilite && <Badge variant="secondary">Passerelle (mobilité)</Badge>}
              <Badge className={statutBadge}>{T3P_STATUT_LABELS[parcours.statut]}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                Étape courante : <span className="font-medium text-foreground">{courante.num}. {courante.label}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                render={
                  <Link href={`/api/parcours-t3p/${parcours.id}`} target="_blank" rel="noopener noreferrer" />
                }
              >
                <FileDown className="h-4 w-4" /> Fiche PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round((faites / total) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {faites}/{total} étapes
            </span>
            <span
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-700 dark:text-emerald-300"
              title="Étapes visées par un collaborateur (contrôle Qualiopi)"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> {validees}/{total} validées
            </span>
          </div>
          {alerte && <AlerteBanner alerte={alerte} />}
          {parcours.inscription && (
            <p className="text-xs text-muted-foreground">
              Formation liée : {parcours.inscription.session.formation.titre} (assiduité et
              émargements suivis sur la session — Qualiopi).
            </p>
          )}

          {/* ── Chronologie des 11 étapes (+ visa collaborateur) ── */}
          <ol className="mt-2 space-y-1.5">
            {etapes.map((e, idx) => (
              <li
                key={e.key}
                className={`flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50 ${
                  e.validation ? "bg-emerald-500/5 ring-1 ring-inset ring-emerald-500/20" : ""
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    e.validation
                      ? "bg-emerald-500 text-white"
                      : e.statut === "fait"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : e.statut === "en_cours"
                          ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {e.validation || e.statut === "fait" ? <Check className="h-3.5 w-3.5" /> : e.num}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className={`text-sm ${e.statut === "fait" ? "" : e.num === courante.num ? "font-semibold" : "text-muted-foreground"}`}>
                      {e.label}
                    </span>
                    {e.faitLe && <span className="text-xs text-muted-foreground">{fmt(e.faitLe)}</span>}
                    {e.statut === "en_cours" && !e.faitLe && (
                      <span className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400">
                        <CircleDashed className="h-3 w-3" /> en cours
                      </span>
                    )}
                  </div>
                  {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                  {e.validation && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                      <ShieldCheck className="h-3 w-3" />
                      Validé par {e.validation.nom} le{" "}
                      {new Date(e.validation.date).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                  {e.alerte && <div className="mt-1"><AlerteBanner alerte={e.alerte} /></div>}
                </div>
                {/* Action de validation manuelle par le collaborateur
                    (blocage séquentiel : la précédente doit être validée). */}
                <div className="shrink-0 self-center">
                  {e.validation ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs text-muted-foreground"
                      disabled={isPending || !peutAnnulerEtape(etapes, idx)}
                      onClick={() => annulerEtape(e)}
                      title={
                        peutAnnulerEtape(etapes, idx)
                          ? "Annuler la validation"
                          : "Annulez d'abord la validation de l'étape suivante"
                      }
                    >
                      <X className="h-3.5 w-3.5" /> Annuler
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      disabled={isPending || !peutValiderEtape(etapes, idx)}
                      onClick={() => validerEtape(e)}
                      title={
                        peutValiderEtape(etapes, idx)
                          ? undefined
                          : "Validez d'abord l'étape précédente"
                      }
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Valider
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* ── Saisie par étape ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Étape 1 — prérequis & dossier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1 · Prérequis &amp; dossier administratif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">Permis B obtenu le</Label>
                <Input type="date" className="h-8" value={s1.permisBDate} onChange={(e) => setS1({ ...s1, permisBDate: e.target.value })} />
              </div>
              <label className="flex items-end gap-2 pb-1 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={s1.conduiteAccompagnee}
                  onChange={(e) => setS1({ ...s1, conduiteAccompagnee: e.target.checked })}
                />
                Conduite accompagnée (2 ans)
              </label>
              <div className="grid gap-1">
                <Label className="text-xs">Permis vérifié le</Label>
                <Input type="date" className="h-8" value={s1.permisVerifieLe} onChange={(e) => setS1({ ...s1, permisVerifieLe: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Casier compatible vérifié le</Label>
                <Input type="date" className="h-8" value={s1.casierVerifieLe} onChange={(e) => setS1({ ...s1, casierVerifieLe: e.target.value })} />
              </div>
              {taxi && (
                <div className="grid gap-1">
                  <Label className="text-xs">PSC1 vérifié le</Label>
                  <Input type="date" className="h-8" value={s1.psc1VerifieLe} onChange={(e) => setS1({ ...s1, psc1VerifieLe: e.target.value })} />
                </div>
              )}
              <div className="grid gap-1">
                <Label className="text-xs">Avis médical (cerfa 14880) du</Label>
                <Input type="date" className="h-8" value={s1.medicalDate} onChange={(e) => setS1({ ...s1, medicalDate: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Avis médical vérifié le</Label>
                <Input type="date" className="h-8" value={s1.medicalVerifieLe} onChange={(e) => setS1({ ...s1, medicalVerifieLe: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Dossier complet le</Label>
                <Input type="date" className="h-8" value={s1.dossierCompletLe} onChange={(e) => setS1({ ...s1, dossierCompletLe: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Pièces à archiver dans les pièces jointes du candidat : permis B, avis médical,
              {taxi ? " PSC1," : ""} justificatifs. L&apos;expression du besoin et le financement
              sont portés par la fiche candidat (Qualiopi ind. 4).
            </p>
            <Button size="sm" disabled={isPending} onClick={() => save(s1, "Prérequis enregistrés.")}>
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        {/* Étapes 2-3 — CMA + frais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2 · Inscription CMA &nbsp;/&nbsp; 3 · Frais d&apos;examen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">CMA / département</Label>
                <Input className="h-8" placeholder="ex. CMA Île-de-France" value={s2.cmaDepartement} onChange={(e) => setS2({ ...s2, cmaDepartement: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">N° de dossier CMA</Label>
                <Input className="h-8" value={s2.cmaNumeroDossier} onChange={(e) => setS2({ ...s2, cmaNumeroDossier: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Inscription CMA faite le</Label>
                <Input type="date" className="h-8" value={s2.cmaInscritLe} onChange={(e) => setS2({ ...s2, cmaInscritLe: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div className="grid gap-1">
                <Label className="text-xs">Montant des frais (€)</Label>
                <Input className="h-8" value={s3.fraisMontant} onChange={(e) => setS3({ ...s3, fraisMontant: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Frais payés le</Label>
                <Input type="date" className="h-8" value={s3.fraisPayesLe} onChange={(e) => setS3({ ...s3, fraisPayesLe: e.target.value })} />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={s3.fraisAvancesParOF}
                  onChange={(e) => setS3({ ...s3, fraisAvancesParOF: e.target.checked })}
                />
                Frais avancés par l&apos;organisme (à refacturer)
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Frais non remboursables en cas d&apos;absence (sauf force majeure). En cas
              d&apos;ajournement, une nouvelle inscription et de nouveaux frais sont dus.
            </p>
            <Button size="sm" disabled={isPending} onClick={() => save({ ...s2, ...s3 }, "Inscription CMA / frais enregistrés.")}>
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        {/* Épreuves théoriques */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                4-6 · Examen théorique (admissibilité)
                {thAdmise && <Badge className="ml-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Admis</Badge>}
              </CardTitle>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => addEpreuve("THEORIE")}>
                <Plus className="mr-1 h-4 w-4" /> Nouvelle présentation
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {epreuvesDuType(parcours, "THEORIE").length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune présentation saisie. Ouvrez une présentation dès réception de la convocation CMA.
              </p>
            ) : (
              epreuvesDuType(parcours, "THEORIE").map((e) => <EpreuveRow key={e.id} epreuve={e} />)
            )}
            <p className="text-xs text-muted-foreground">
              Admissible si moyenne ≥ 10/20 sans note éliminatoire. Le résultat « Admis » fixe
              automatiquement la date d&apos;admissibilité (départ du délai d&apos;1 an).
            </p>
          </CardContent>
        </Card>

        {/* Épreuve pratique */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                7-10 · Examen pratique (admission) — {tentativesPratique}/{T3P_MAX_TENTATIVES_PRATIQUE} présentation(s) consommée(s)
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending || !thAdmise || tentativesPratique >= T3P_MAX_TENTATIVES_PRATIQUE}
                onClick={() => addEpreuve("PRATIQUE")}
                title={!thAdmise ? "Théorie non admise" : undefined}
              >
                <Plus className="mr-1 h-4 w-4" /> Nouvelle présentation
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {epreuvesDuType(parcours, "PRATIQUE").length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {thAdmise
                  ? "Aucune présentation saisie : la CMA convoque dans les 2 mois suivant l'admissibilité."
                  : "Réservé aux candidats admissibles (théorie admise)."}
              </p>
            ) : (
              epreuvesDuType(parcours, "PRATIQUE").map((e) => <EpreuveRow key={e.id} epreuve={e} />)
            )}
            <p className="text-xs text-muted-foreground">
              3 présentations maximum dans un délai d&apos;1 an après l&apos;admissibilité. Le
              résultat « Admis » clôt le parcours (Réussi) et alimente le taux de réussite
              de l&apos;inscription liée (Qualiopi ind. 2 / BPF).
            </p>
          </CardContent>
        </Card>

        {/* Formations (jalons) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">5 · Formation théorique &nbsp;/&nbsp; 8 · Formation pratique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">Formation théorique terminée le</Label>
                <Input type="date" className="h-8" value={sf.formationTheoriqueFaiteLe} onChange={(e) => setSf({ ...sf, formationTheoriqueFaiteLe: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Formation pratique terminée le</Label>
                <Input type="date" className="h-8" value={sf.formationPratiqueFaiteLe} onChange={(e) => setSf({ ...sf, formationPratiqueFaiteLe: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              L&apos;assiduité (émargements), le positionnement et les évaluations sont portés
              par la session de formation liée (Qualiopi ind. 9-11).
            </p>
            <Button size="sm" disabled={isPending} onClick={() => save(sf, "Jalons de formation enregistrés.")}>
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        {/* Étape 11 + suivi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">11 · Carte professionnelle &amp; suivi du parcours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">Carte pro demandée le</Label>
                <Input type="date" className="h-8" value={s11.carteProDemandeeLe} onChange={(e) => setS11({ ...s11, carteProDemandeeLe: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Carte pro obtenue le</Label>
                <Input type="date" className="h-8" value={s11.carteProObtenueLe} onChange={(e) => setS11({ ...s11, carteProObtenueLe: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">N° de carte professionnelle</Label>
                <Input className="h-8" value={s11.carteProNumero} onChange={(e) => setS11({ ...s11, carteProNumero: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Statut du parcours</Label>
                <select className={selectClass} value={suivi.statut} onChange={(e) => setSuivi({ ...suivi, statut: e.target.value })}>
                  {Object.entries(T3P_STATUT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Admissibilité publiée le</Label>
                <Input type="date" className="h-8" value={suivi.admissibiliteLe} onChange={(e) => setSuivi({ ...suivi, admissibiliteLe: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Commentaire de suivi</Label>
              <textarea
                className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                value={suivi.commentaire}
                onChange={(e) => setSuivi({ ...suivi, commentaire: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Demande de carte professionnelle en préfecture via Démarches Simplifiées, après la
              réussite à l&apos;examen.
            </p>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                save(
                  { ...s11, statut: suivi.statut as "EN_COURS" | "REUSSI" | "ABANDONNE", admissibiliteLe: suivi.admissibiliteLe, commentaire: suivi.commentaire },
                  "Suivi enregistré.",
                )
              }
            >
              Enregistrer
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
