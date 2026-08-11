"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FINANCEMENT_LABELS,
  CNAPS_STATUT_LABELS,
  DIPLOME_OPTIONS,
} from "@/lib/validators/candidat";
import { PAYS_NOMS, NATIONALITES } from "@/lib/data/pays";
import { DEPARTEMENTS } from "@/lib/data/departements";
import { SITUATIONS_PRO, SITUATION_AUTRE } from "@/lib/data/situations-pro";
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
  showCnaps = false,
  showSsiap = false,
  ssiapNiveau,
}: {
  token: string;
  defaults: Partial<ParcoursFormValues>;
  /** Bloc « sécurité privée / CNAPS » (formations TFP APS…), selon la formation. */
  showCnaps?: boolean;
  /** Bloc « diplôme SSIAP détenu » (recyclage / remise à niveau), selon la formation. */
  showSsiap?: boolean;
  ssiapNiveau?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Situation professionnelle : liste + « Autre » (champ libre), comme le
  // formulaire interne d'ajout de candidat.
  const dvSituation = defaults.situationPro ?? "";
  const initSituation = dvSituation
    ? SITUATIONS_PRO.includes(dvSituation)
      ? dvSituation
      : SITUATION_AUTRE
    : "";
  const [situationAutre, setSituationAutre] = useState(
    dvSituation && !SITUATIONS_PRO.includes(dvSituation) ? dvSituation : "",
  );

  const [v, setV] = useState<ParcoursFormValues>({
    telephone: defaults.telephone ?? "",
    dateNaissance: defaults.dateNaissance ?? "",
    nationalite: defaults.nationalite ?? "",
    paysNaissance: defaults.paysNaissance ?? "",
    departementNaissance: defaults.departementNaissance ?? "",
    lieuNaissance: defaults.lieuNaissance ?? "",
    adresse: defaults.adresse ?? "",
    codePostal: defaults.codePostal ?? "",
    ville: defaults.ville ?? "",
    pays: defaults.pays ?? "France",
    situationPro: initSituation,
    employeur: defaults.employeur ?? "",
    posteOccupe: defaults.posteOccupe ?? "",
    dernierDiplome: defaults.dernierDiplome ?? "",
    financementType: defaults.financementType ?? "",
    situationHandicap: defaults.situationHandicap ?? false,
    besoinsAdaptation: defaults.besoinsAdaptation ?? "",
    cnapsStatut: defaults.cnapsStatut ?? "",
    carteProNumero: defaults.carteProNumero ?? "",
    carteProValidite: defaults.carteProValidite ?? "",
    ssiapNiveau: defaults.ssiapNiveau ?? (ssiapNiveau ? String(ssiapNiveau) : ""),
    ssiapDiplomeNumero: defaults.ssiapDiplomeNumero ?? "",
    ssiapDiplomeDate: defaults.ssiapDiplomeDate ?? "",
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
    // « Autre » → reporte le texte libre dans situationPro.
    const payload: ParcoursFormValues = { ...v };
    if (v.situationPro === SITUATION_AUTRE) {
      payload.situationPro = situationAutre.trim() || SITUATION_AUTRE;
    }
    startTransition(async () => {
      const res = await submitParcoursForm(token, payload);
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
        onChange={(dataUrl) => setV((p) => ({ ...p, photoDataUrl: dataUrl ?? "" }))}
      />

      {/* Coordonnées & naissance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input id="telephone" value={v.telephone} onChange={(e) => set("telephone", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dateNaissance">Date de naissance</Label>
          <Input id="dateNaissance" type="date" value={v.dateNaissance} onChange={(e) => set("dateNaissance", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nationalite">Nationalité</Label>
          <select id="nationalite" className={sx} value={v.nationalite} onChange={(e) => set("nationalite", e.target.value)}>
            <option value="">— Sélectionner —</option>
            {NATIONALITES.map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="paysNaissance">Pays de naissance</Label>
          <select id="paysNaissance" className={sx} value={v.paysNaissance} onChange={(e) => set("paysNaissance", e.target.value)}>
            <option value="">— Sélectionner —</option>
            {PAYS_NOMS.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="departementNaissance">Département de naissance</Label>
          <select id="departementNaissance" className={sx} value={v.departementNaissance} onChange={(e) => set("departementNaissance", e.target.value)}>
            <option value="">— Sélectionner —</option>
            {DEPARTEMENTS.map((d) => (<option key={d.code} value={d.code}>{d.code} — {d.nom}</option>))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lieuNaissance">Commune de naissance</Label>
          <Input id="lieuNaissance" value={v.lieuNaissance} onChange={(e) => set("lieuNaissance", e.target.value)} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="adresse">Adresse</Label>
          <Input id="adresse" value={v.adresse} onChange={(e) => set("adresse", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="codePostal">Code postal</Label>
          <Input id="codePostal" value={v.codePostal} onChange={(e) => set("codePostal", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ville">Ville</Label>
          <Input id="ville" value={v.ville} onChange={(e) => set("ville", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pays">Pays</Label>
          <select id="pays" className={sx} value={v.pays} onChange={(e) => set("pays", e.target.value)}>
            {PAYS_NOMS.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </div>
      </div>

      {/* Situation professionnelle */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="situationPro">Situation professionnelle</Label>
          <select id="situationPro" className={sx} value={v.situationPro} onChange={(e) => set("situationPro", e.target.value)}>
            <option value="">— Sélectionner —</option>
            {SITUATIONS_PRO.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        {v.situationPro === SITUATION_AUTRE && (
          <div className="grid gap-1.5">
            <Label htmlFor="situationAutre">Préciser la situation</Label>
            <Input id="situationAutre" value={situationAutre} onChange={(e) => setSituationAutre(e.target.value)} placeholder="Décrivez votre situation…" />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="employeur">Employeur (le cas échéant)</Label>
          <Input id="employeur" value={v.employeur} onChange={(e) => set("employeur", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="posteOccupe">Poste occupé</Label>
          <Input id="posteOccupe" value={v.posteOccupe} onChange={(e) => set("posteOccupe", e.target.value)} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="dernierDiplome">Dernier diplôme obtenu</Label>
          <Input id="dernierDiplome" list="parcours-diplome-options" placeholder="Choisissez ou saisissez…" value={v.dernierDiplome} onChange={(e) => set("dernierDiplome", e.target.value)} />
          <datalist id="parcours-diplome-options">
            {DIPLOME_OPTIONS.map((d) => (<option key={d} value={d} />))}
          </datalist>
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="financementType">Mode de financement</Label>
          <select id="financementType" className={sx} value={v.financementType} onChange={(e) => set("financementType", e.target.value)}>
            <option value="">À préciser</option>
            {Object.entries(FINANCEMENT_LABELS).map(([k, l]) => (<option key={k} value={k}>{l}</option>))}
          </select>
        </div>
      </div>

      {/* Sécurité privée (CNAPS) — affiché seulement si la formation le requiert */}
      {showCnaps && (
        <div className="rounded-lg border p-3">
          <p className="mb-3 text-sm font-medium">Sécurité privée (CNAPS)</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cnapsStatut">Autorisation préalable CNAPS</Label>
              <select id="cnapsStatut" className={sx} value={v.cnapsStatut} onChange={(e) => set("cnapsStatut", e.target.value)}>
                <option value="">— À renseigner —</option>
                {Object.entries(CNAPS_STATUT_LABELS).map(([k, l]) => (<option key={k} value={k}>{l}</option>))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="carteProNumero">N° carte professionnelle</Label>
              <Input id="carteProNumero" placeholder="CAR-…" value={v.carteProNumero} onChange={(e) => set("carteProNumero", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="carteProValidite">Validité carte pro</Label>
              <Input id="carteProValidite" type="date" value={v.carteProValidite} onChange={(e) => set("carteProValidite", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Diplôme SSIAP détenu — affiché seulement pour un recyclage / remise à niveau SSIAP */}
      {showSsiap && (
        <div className="rounded-lg border p-3">
          <p className="mb-3 text-sm font-medium">Diplôme SSIAP {ssiapNiveau ?? ""} détenu (recyclage / remise à niveau)</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ssiapNiveau">Niveau du diplôme</Label>
              <select id="ssiapNiveau" className={sx} value={v.ssiapNiveau} onChange={(e) => set("ssiapNiveau", e.target.value)}>
                <option value="">— Non concerné —</option>
                <option value="1">SSIAP 1</option>
                <option value="2">SSIAP 2</option>
                <option value="3">SSIAP 3</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ssiapDiplomeNumero">N° du diplôme</Label>
              <Input id="ssiapDiplomeNumero" placeholder="091-9119-1-2018-00246" value={v.ssiapDiplomeNumero} onChange={(e) => set("ssiapDiplomeNumero", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ssiapDiplomeDate">Date d&apos;obtention</Label>
              <Input id="ssiapDiplomeDate" type="date" value={v.ssiapDiplomeDate} onChange={(e) => set("ssiapDiplomeDate", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Accessibilité (handicap) */}
      <div className="rounded-lg border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 rounded border" checked={!!v.situationHandicap} onChange={(e) => set("situationHandicap", e.target.checked)} />
          Situation de handicap — besoin d&apos;un aménagement
        </label>
        {v.situationHandicap && (
          <div className="mt-3 grid gap-1.5">
            <Label htmlFor="besoinsAdaptation">Besoins d&apos;adaptation</Label>
            <textarea
              id="besoinsAdaptation"
              rows={3}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              placeholder="Aménagements nécessaires — notre référent handicap vous contactera."
              value={v.besoinsAdaptation}
              onChange={(e) => set("besoinsAdaptation", e.target.value)}
            />
          </div>
        )}
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={v.consent} onChange={(e) => set("consent", e.target.checked)} />
        <span>
          J&apos;atteste l&apos;exactitude des informations fournies et j&apos;accepte leur
          traitement dans le cadre de ma formation (RGPD). *
        </span>
      </label>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement…" : "Valider mes informations"}
      </Button>
    </form>
  );
}
