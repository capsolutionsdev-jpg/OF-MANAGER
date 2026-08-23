"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Mail, Phone, Globe, Search, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { setLeadStatut } from "@/lib/actions/console-actions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { STATUT_OPTIONS, statutTone, statutLabel } from "@/components/console/lead-statut";
import { PRIORITE_LABELS, type Priorite } from "@/lib/growth/crm-prospect";
import type { LeadRow } from "@/components/console/leads-table";
import { cn } from "@/lib/utils";

// Vue « Secteur » — reproduit le découpage des fichiers Excel de prospection :
// regroupement par RÉGION (sécurité) ou DÉPARTEMENT (transport), blocs teintés
// alternativement, priorité et suivi commercial en ligne.

type GroupBy = "region" | "departement" | "statut" | "priorite";

const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: "region", label: "Région" },
  { key: "departement", label: "Département" },
  { key: "statut", label: "Statut" },
  { key: "priorite", label: "Priorité" },
];

const PRIORITE_TONE: Record<Priorite, string> = {
  haute: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  moyenne: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  basse: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400",
};

const SANS_GROUPE = "À déterminer";

function groupValue(l: LeadRow, by: GroupBy): string {
  if (by === "region") return l.region || SANS_GROUPE;
  if (by === "departement") return l.departement || SANS_GROUPE;
  if (by === "priorite") return l.priorite ? PRIORITE_LABELS[l.priorite as Priorite] ?? l.priorite : "Sans priorité";
  return statutLabel(l.statut);
}

function StatutSelect({ lead }: { lead: LeadRow }) {
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-1">
      <select
        defaultValue={lead.statut}
        disabled={pending}
        onChange={(e) => { const v = e.target.value; start(() => setLeadStatut(lead.id, v)); }}
        className="h-7 max-w-[8.5rem] rounded-md border bg-transparent px-1.5 text-xs font-medium"
        aria-label={`Statut de ${lead.nom}`}
      >
        {STATUT_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
      {pending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
    </span>
  );
}

export function LeadsCrmList({ leads }: { leads: LeadRow[] }) {
  const [q, setQ] = useState("");
  const [verticale, setVerticale] = useState<"tous" | "securite" | "transport">("tous");
  const [statut, setStatut] = useState<string>("tous");
  const [priorite, setPriorite] = useState<string>("tous");
  const [groupBy, setGroupBy] = useState<GroupBy>("region");

  // Filtrer.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (verticale !== "tous" && l.verticale !== verticale) return false;
      if (statut !== "tous" && l.statut !== statut) return false;
      if (priorite !== "tous") {
        if (priorite === "aucune" ? l.priorite : l.priorite !== priorite) return false;
      }
      if (needle) {
        const hay = [l.nom, l.organisme, l.representantLegal, l.ville, l.departement, l.region, l.email, l.siret]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [leads, q, verticale, statut, priorite]);

  // Regrouper + trier (« À déterminer » et « Sans priorité » en fin).
  const groups = useMemo(() => {
    const map = new Map<string, LeadRow[]>();
    for (const l of filtered) {
      const k = groupValue(l, groupBy);
      (map.get(k) ?? map.set(k, []).get(k)!).push(l);
    }
    const entries = [...map.entries()];
    entries.sort((a, b) => {
      const aLast = a[0] === SANS_GROUPE || a[0] === "Sans priorité";
      const bLast = b[0] === SANS_GROUPE || b[0] === "Sans priorité";
      if (aLast !== bLast) return aLast ? 1 : -1;
      return a[0].localeCompare(b[0], "fr");
    });
    // Tri interne : par ville puis nom (comme l'Excel).
    for (const [, rows] of entries) {
      rows.sort((x, y) => (x.ville || "").localeCompare(y.ville || "", "fr") || x.nom.localeCompare(y.nom, "fr"));
    }
    return entries;
  }, [filtered, groupBy]);

  const selectCls = "h-8 rounded-lg border bg-transparent px-2 text-xs font-medium";

  return (
    <div className="space-y-3">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (OF, ville, SIRET…)" className="h-8 w-56 pl-8 text-sm" />
        </div>
        <select value={verticale} onChange={(e) => { const v = e.target.value as typeof verticale; setVerticale(v); if (v === "transport") setGroupBy("departement"); else if (v === "securite") setGroupBy("region"); }} className={selectCls} aria-label="Métier">
          <option value="tous">Tous les métiers</option>
          <option value="securite">Sécurité privée</option>
          <option value="transport">Transport (Taxi/VTC)</option>
        </select>
        <select value={statut} onChange={(e) => setStatut(e.target.value)} className={selectCls} aria-label="Statut">
          <option value="tous">Tous statuts</option>
          {STATUT_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={priorite} onChange={(e) => setPriorite(e.target.value)} className={selectCls} aria-label="Priorité">
          <option value="tous">Toutes priorités</option>
          <option value="haute">Haute</option>
          <option value="moyenne">Moyenne</option>
          <option value="basse">Basse</option>
          <option value="aucune">Sans priorité</option>
        </select>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Grouper par</span>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className={selectCls} aria-label="Grouper par">
            {GROUP_OPTIONS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} prospect{filtered.length > 1 ? "s" : ""} · {groups.length} groupe{groups.length > 1 ? "s" : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Aucun prospect pour ces filtres.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[880px] text-sm">
            <tbody>
              {groups.map(([groupe, rows], gi) => (
                <GroupSection key={groupe} groupe={groupe} rows={rows} tint={gi % 2 === 0} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GroupSection({ groupe, rows, tint }: { groupe: string; rows: LeadRow[]; tint: boolean }) {
  const avecMail = rows.filter((r) => r.email).length;
  return (
    <>
      <tr className={cn("border-t", tint ? "bg-muted/50" : "bg-muted/25")}>
        <td colSpan={6} className="px-4 py-2">
          <span className="text-sm font-semibold">{groupe}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {rows.length} prospect{rows.length > 1 ? "s" : ""} · {avecMail} avec e-mail
          </span>
        </td>
      </tr>
      {rows.map((l) => (
        <tr key={l.id} className="border-t hover:bg-muted/20">
          <td className="px-4 py-2 align-top">
            <Link href={`/console/prospects/${l.id}`} className="inline-flex items-center gap-1.5 font-medium hover:text-primary">
              {!l.lu && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Non lu" />}
              <span className="max-w-[16rem] truncate">{l.nom}</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            </Link>
            {l.agrementEchu && (
              <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                <AlertTriangle className="h-3 w-3" /> Agrément échu
              </span>
            )}
            {l.representantLegal && <p className="max-w-[18rem] truncate text-xs text-muted-foreground">{l.representantLegal}</p>}
            {l.typeFormation && <p className="text-[11px] font-medium text-cyan-700 dark:text-cyan-400">{l.typeFormation}</p>}
          </td>
          <td className="px-3 py-2 align-top text-xs text-muted-foreground">
            {l.ville && <div className="truncate">{l.ville}</div>}
            {l.codePostal && <div>{l.codePostal}</div>}
          </td>
          <td className="px-3 py-2 align-top text-xs">
            <div className="flex flex-col gap-0.5">
              {l.email && <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"><Mail className="h-3 w-3" /><span className="max-w-[13rem] truncate">{l.email}</span></a>}
              {l.telephone && <a href={`tel:${l.telephone}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"><Phone className="h-3 w-3" />{l.telephone}</a>}
              {l.siteWeb && <a href={l.siteWeb.startsWith("http") ? l.siteWeb : `https://${l.siteWeb}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"><Globe className="h-3 w-3" />Site</a>}
              {!l.email && !l.telephone && <span className="text-muted-foreground/60">à compléter</span>}
            </div>
          </td>
          <td className="px-3 py-2 align-top">
            {l.priorite && (
              <Badge variant="outline" className={cn("text-[10px]", PRIORITE_TONE[l.priorite as Priorite])}>
                {PRIORITE_LABELS[l.priorite as Priorite] ?? l.priorite}
              </Badge>
            )}
          </td>
          <td className="px-3 py-2 align-top">
            <Badge className={cn("text-[10px]", statutTone(l.statut))}>{statutLabel(l.statut)}</Badge>
          </td>
          <td className="px-3 py-2 align-top text-right"><StatutSelect lead={l} /></td>
        </tr>
      ))}
    </>
  );
}
