"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createContratPrestation,
  type ContratPrestationState,
} from "@/lib/actions/contrat-prestation-actions";
import { euros, type FormuleKey } from "@/lib/plans";
import {
  OPTIONS,
  PACKS_METIER,
  optionStatut,
  packDisponible,
  FRAIS_MISE_EN_SERVICE,
} from "@/lib/options";
import { OFFRE_PIONNIERS, type PionnierVariante } from "@/lib/offre-lancement";
import { computeContratTotals, type ContratData } from "@/lib/contrats/prestation";

type PlanOpt = { key: FormuleKey; name: string; price: number };

const VARIANTES: { key: "" | PionnierVariante; label: string }[] = [
  { key: "", label: "Aucune offre" },
  { key: "MENSUEL_6M", label: OFFRE_PIONNIERS.variantes.MENSUEL_6M.label },
  { key: "ANNUEL_12M_PREPAYE", label: OFFRE_PIONNIERS.variantes.ANNUEL_12M_PREPAYE.label },
];

export function DevisBuilder({
  organismes,
  plans,
}: {
  organismes: { id: string; nom: string }[];
  plans: PlanOpt[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ContratPrestationState | undefined, FormData>(
    createContratPrestation,
    undefined,
  );

  const [organismeId, setOrganismeId] = useState(organismes[0]?.id ?? "");
  const [palier, setPalier] = useState<FormuleKey>(plans[1]?.key ?? plans[0]?.key ?? "PRO");
  const [montant, setMontant] = useState("");
  const [remise, setRemise] = useState("0");
  const [engagement, setEngagement] = useState<"MENSUEL" | "ANNUEL">("MENSUEL");
  const [variante, setVariante] = useState<"" | PionnierVariante>("");
  const [options, setOptions] = useState<Set<string>>(new Set());
  const [packs, setPacks] = useState<Set<string>>(new Set());
  const [dateDebut, setDateDebut] = useState("");

  const planPrice = useMemo(() => plans.find((p) => p.key === palier)?.price ?? 0, [plans, palier]);
  const isPionnier = variante !== "";
  const base = montant.trim() ? Number(montant.replace(",", ".")) : planPrice;

  // Purge les options/packs indisponibles quand le palier change.
  useEffect(() => {
    setOptions((prev) => new Set([...prev].filter((k) => {
      const o = OPTIONS.find((x) => x.key === k);
      return o ? optionStatut(o, palier) !== "indisponible" : false;
    })));
    setPacks((prev) => new Set([...prev].filter((k) => {
      const p = PACKS_METIER.find((x) => x.key === k);
      return p ? packDisponible(p, palier) : false;
    })));
  }, [palier]);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Devis créé.");
      router.push("/console/devis");
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const preview = useMemo<ContratData>(() => {
    const v = isPionnier ? OFFRE_PIONNIERS.variantes[variante as PionnierVariante] : null;
    return {
      reference: "",
      palier,
      formuleNom: plans.find((p) => p.key === palier)?.name ?? palier,
      montantMensuel: Number.isFinite(base) && base > 0 ? base : planPrice,
      remisePct: v ? v.remisePct : Math.min(100, Math.max(0, Number(remise) || 0)),
      engagement: v ? v.engagement : engagement,
      options: [...options],
      packs: [...packs],
      fraisMiseEnService: v ? 0 : FRAIS_MISE_EN_SERVICE[palier],
      pionnier: v ? { variante, prixGele: true } : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPionnier, variante, palier, base, planPrice, remise, engagement, [...options].join(","), [...packs].join(",")]);

  const t = computeContratTotals(preview);

  const toggleOption = (key: string) =>
    setOptions((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  const togglePack = (key: string) =>
    setPacks((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const labelCls = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <form action={formAction} className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
      {/* champs soumis */}
      <input type="hidden" name="organismeId" value={organismeId} />
      <input type="hidden" name="formule" value={palier} />
      <input type="hidden" name="engagement" value={engagement} />
      <input type="hidden" name="montantMensuel" value={montant} />
      <input type="hidden" name="remisePct" value={remise} />
      <input type="hidden" name="options" value={[...options].join(",")} />
      <input type="hidden" name="packs" value={[...packs].join(",")} />
      <input type="hidden" name="pionnierVariante" value={variante} />
      <input type="hidden" name="fraisMiseEnService" value={String(FRAIS_MISE_EN_SERVICE[palier])} />
      <input type="hidden" name="dateDebut" value={dateDebut} />

      {/* ── Constructeur ── */}
      <div className="space-y-6">
        {/* Client */}
        <section className="space-y-2">
          <p className={labelCls}>Client</p>
          <select
            value={organismeId}
            onChange={(e) => setOrganismeId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {organismes.length === 0 && <option value="">Aucun organisme client</option>}
            {organismes.map((o) => (
              <option key={o.id} value={o.id}>{o.nom}</option>
            ))}
          </select>
        </section>

        {/* Palier */}
        <section className="space-y-2">
          <p className={labelCls}>Palier</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPalier(p.key)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  palier === p.key ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "hover:bg-muted",
                )}
              >
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-muted-foreground">{euros(p.price)}/mois</div>
              </button>
            ))}
          </div>
        </section>

        {/* Montant / remise / engagement */}
        <section className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs font-medium">
            Abonnement HT (€) <span className="font-normal text-muted-foreground">— vide = prix palier</span>
            <Input value={montant} onChange={(e) => setMontant(e.target.value)} type="number" step="0.01" min="0" placeholder={String(planPrice)} />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Remise (%){isPionnier && <span className="font-normal text-muted-foreground"> — imposée par l'offre</span>}
            <Input value={isPionnier ? String(OFFRE_PIONNIERS.variantes[variante as PionnierVariante].remisePct) : remise} onChange={(e) => setRemise(e.target.value)} type="number" min="0" max="100" disabled={isPionnier} />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Engagement{isPionnier && <span className="font-normal text-muted-foreground"> — imposé</span>}
            <select
              value={isPionnier ? OFFRE_PIONNIERS.variantes[variante as PionnierVariante].engagement : engagement}
              onChange={(e) => setEngagement(e.target.value as "MENSUEL" | "ANNUEL")}
              disabled={isPionnier}
              className="rounded-md border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
            >
              <option value="MENSUEL">Mensuel, sans engagement</option>
              <option value="ANNUEL">Annuel (12 mois)</option>
            </select>
          </label>
        </section>

        {/* Offre Pionniers */}
        <section className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
            <Sparkles className="h-4 w-4" /> Offre de lancement « Pionniers »
          </p>
          <div className="flex flex-wrap gap-2">
            {VARIANTES.map((v) => (
              <button
                key={v.key || "none"}
                type="button"
                onClick={() => setVariante(v.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  variante === v.key ? "border-amber-500 bg-amber-500/15 text-amber-800" : "hover:bg-muted",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          {isPionnier && (
            <p className="text-xs text-amber-800/80">
              Mise en service + activation des packs <b>offertes</b>, prix <b>gelé à vie</b>. Contreparties : témoignage à 60 j, logo + cas chiffré, 1 h produit/trimestre.
            </p>
          )}
        </section>

        {/* Options */}
        <section className="space-y-2">
          <p className={labelCls}>Options à la carte</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {OPTIONS.map((o) => {
              const st = optionStatut(o, palier);
              const checked = options.has(o.key);
              const disabled = st !== "souscriptible";
              return (
                <label
                  key={o.key}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-2.5 text-sm",
                    disabled ? "opacity-55" : "cursor-pointer hover:bg-muted",
                    checked && !disabled && "border-primary/40 bg-primary/5",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={st === "incluse" ? true : checked}
                    disabled={disabled}
                    onChange={() => toggleOption(o.key)}
                  />
                  <span className="flex-1">
                    <span className="font-medium">{o.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {st === "incluse" ? "Inclus dans ce palier" : st === "indisponible" ? `Disponible dès ${o.ouvertDes}` : `+ ${euros(o.prixMois)}/mois`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Packs métier */}
        <section className="space-y-2">
          <p className={labelCls}>Packs métier</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PACKS_METIER.map((p) => {
              const dispo = packDisponible(p, palier);
              const checked = packs.has(p.key);
              return (
                <label
                  key={p.key}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-2.5 text-sm",
                    !dispo ? "opacity-55" : "cursor-pointer hover:bg-muted",
                    checked && dispo && "border-primary/40 bg-primary/5",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={checked}
                    disabled={!dispo}
                    onChange={() => togglePack(p.key)}
                  />
                  <span className="flex-1">
                    <span className="font-medium">{p.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {dispo ? `${euros(p.activation)} activation + ${euros(p.prixMois)}/mois` : `Disponible dès ${p.ouvertDes}`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Date d'effet */}
        <section className="grid gap-1 text-xs font-medium sm:max-w-xs">
          Date d&apos;effet
          <Input value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} type="date" />
        </section>
      </div>

      {/* ── Récapitulatif live ── */}
      <aside className="space-y-3 rounded-xl border bg-muted/20 p-4 lg:sticky lg:top-4">
        <p className="text-sm font-semibold">Récapitulatif</p>
        <dl className="space-y-1.5 text-sm">
          <Line label="Abonnement net" value={euros(t.abonnementNet)} />
          {t.optionsMois > 0 && <Line label="Options" value={`+ ${euros(t.optionsMois)}`} />}
          {t.packsMois > 0 && <Line label="Packs métier" value={`+ ${euros(t.packsMois)}`} />}
          <div className="my-1 border-t" />
          <Line label="Récurrent / mois" value={euros(t.recurrentMois)} strong />
          {preview.engagement === "ANNUEL" && <Line label="Total 12 mois" value={euros(t.totalEngagement)} />}
          <div className="my-1 border-t" />
          {isPionnier ? (
            <Line label="Frais initiaux" value="Offerts" muted />
          ) : (
            <Line label="Frais initiaux (1×)" value={euros(t.oneTimeTotal)} />
          )}
          <Line label="À encaisser à la signature" value={euros(t.encaisseSignature)} strong />
        </dl>
        <Button type="submit" className="w-full" disabled={pending || !organismeId}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileSignature className="mr-1.5 h-4 w-4" />}
          Créer le devis (brouillon)
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Créé en brouillon. L'envoi pour signature se fait depuis la fiche client.
        </p>
      </aside>
    </form>
  );
}

function Line({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className={cn("text-muted-foreground", strong && "font-medium text-foreground")}>{label}</dt>
      <dd className={cn("tabular-nums", strong && "font-bold", muted && "text-emerald-600")}>{value}</dd>
    </div>
  );
}
