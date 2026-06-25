"use client";

import { useMemo, useState } from "react";
import { Calculator, FileText, ListChecks, Building2, Wallet, Clock, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DISPOSITIFS,
  STATUT_LABELS,
  ACTIVITE_LABELS,
  NIVEAU_LABELS,
  type Activite,
  type ProfilFinancement,
  type StatutProspect,
} from "@/lib/financement/dispositifs";
import { eligibiliteFor, trierResultats } from "@/lib/financement/eligibilite";

const champ =
  "mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm";
const label = "text-xs font-medium text-muted-foreground";

const NIVEAU_STYLE: Record<string, string> = {
  prioritaire: "bg-emerald-500/10 text-emerald-700",
  eligible: "bg-sky-500/10 text-sky-700",
  conditions: "bg-amber-500/10 text-amber-700",
};

export function SimulateurFinancement({
  prenom,
  nom,
}: {
  prenom?: string;
  nom?: string;
}) {
  const [statut, setStatut] = useState<StatutProspect>("salarie_prive");
  const [microEntreprise, setMicroEntreprise] = useState<boolean>(false);
  const [activite, setActivite] = useState<Activite>("liberal");
  const [taille, setTaille] = useState<"tpe" | "pme" | "eti_ge">("tpe");
  const [reconversion, setReconversion] = useState(false);
  const [handicap, setHandicap] = useState(false);

  const estIndependant = statut === "independant_tns" || statut === "dirigeant_tpe";
  const estSalarie = statut === "salarie_prive";

  const profil: ProfilFinancement = useMemo(
    () => ({
      statut,
      microEntreprise: estIndependant ? microEntreprise : undefined,
      activite: estIndependant ? activite : undefined,
      tailleEntreprise: estSalarie ? taille : undefined,
      reconversion: estSalarie ? reconversion : undefined,
      handicap,
    }),
    [statut, microEntreprise, activite, taille, reconversion, handicap, estIndependant, estSalarie],
  );

  const resultats = useMemo(() => trierResultats(eligibiliteFor(profil)), [profil]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Formulaire */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" /> Profil du prospect
            {(prenom || nom) && (
              <span className="text-sm font-normal text-muted-foreground">— {prenom} {nom}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className={label}>Statut professionnel</span>
            <select className={champ} value={statut} onChange={(e) => setStatut(e.target.value as StatutProspect)}>
              {(Object.keys(STATUT_LABELS) as StatutProspect[]).map((s) => (
                <option key={s} value={s}>{STATUT_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Question micro / auto-entreprise (indépendants) */}
          {estIndependant && (
            <>
              <div>
                <span className={label}>Êtes-vous en micro-entreprise / auto-entreprise ?</span>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMicroEntreprise(true)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${microEntreprise ? "border-primary bg-primary/10 font-medium" : "bg-background"}`}
                  >
                    Oui
                  </button>
                  <button
                    type="button"
                    onClick={() => setMicroEntreprise(false)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${!microEntreprise ? "border-primary bg-primary/10 font-medium" : "bg-background"}`}
                  >
                    Non (EI, EURL, SASU…)
                  </button>
                </div>
              </div>
              <div>
                <span className={label}>Secteur d'activité (route le FAF)</span>
                <select className={champ} value={activite} onChange={(e) => setActivite(e.target.value as Activite)}>
                  {(Object.keys(ACTIVITE_LABELS) as Activite[]).map((a) => (
                    <option key={a} value={a}>{ACTIVITE_LABELS[a]}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Salarié : taille entreprise + reconversion */}
          {estSalarie && (
            <>
              <div>
                <span className={label}>Taille de l'entreprise</span>
                <select className={champ} value={taille} onChange={(e) => setTaille(e.target.value as typeof taille)}>
                  <option value="tpe">TPE (&lt; 11 salariés)</option>
                  <option value="pme">PME (11 à 49 salariés)</option>
                  <option value="eti_ge">ETI / grande entreprise (≥ 50)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={reconversion} onChange={(e) => setReconversion(e.target.checked)} />
                Projet de reconversion (changement de métier)
              </label>
            </>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={handicap} onChange={(e) => setHandicap(e.target.checked)} />
            Bénéficiaire de l'obligation d'emploi (RQTH)
          </label>
        </CardContent>
      </Card>

      {/* Résultats */}
      <div className="space-y-4 lg:col-span-2">
        <p className="text-sm text-muted-foreground">
          <Info className="mr-1 inline h-4 w-4" />
          {resultats.length} dispositif(s) mobilisable(s). Un projet peut en cumuler plusieurs (ex. CPF + OPCO) pour réduire le reste à charge.
        </p>
        {resultats.map(({ dispositifId, niveau, note }) => {
          const d = DISPOSITIFS[dispositifId];
          if (!d) return null;
          return (
            <Card key={dispositifId}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {d.nom} <span className="text-muted-foreground">({d.sigle})</span>
                  </CardTitle>
                  <Badge className={NIVEAU_STYLE[niveau]}>{NIVEAU_LABELS[niveau]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{d.operateur}</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{d.resume}</p>
                {note && (
                  <p className="rounded-md bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground">{note}</p>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <p className="flex items-start gap-1.5 text-[13px]">
                    <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {d.priseEnCharge}
                  </p>
                  <p className="flex items-start gap-1.5 text-[13px]">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {d.delais}
                  </p>
                </div>

                <details className="rounded-md border bg-muted/20 p-3">
                  <summary className="cursor-pointer text-[13px] font-medium">
                    Conditions, procédure et dossier administratif
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" /> Conditions d'éligibilité
                      </p>
                      <ul className="list-disc space-y-0.5 pl-5 text-[13px]">
                        {d.conditions.map((c) => <li key={c}>{c}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                        <ListChecks className="h-3.5 w-3.5" /> Procédure de montage
                      </p>
                      <ol className="list-decimal space-y-0.5 pl-5 text-[13px]">
                        {d.procedure.map((s) => <li key={s}>{s}</li>)}
                      </ol>
                    </div>
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" /> Dossier administratif (pièces)
                      </p>
                      <ul className="space-y-0.5 pl-1 text-[13px]">
                        {d.dossier.map((p) => <li key={p} className="flex gap-2"><span>☐</span>{p}</li>)}
                      </ul>
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>
          );
        })}
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700">
          ⚠️ Montants, plafonds et critères <strong>indicatifs</strong> — ils évoluent chaque année.
          À confirmer auprès du financeur (OPCO, FAF, France Travail…) avant tout engagement.
        </p>
      </div>
    </div>
  );
}
