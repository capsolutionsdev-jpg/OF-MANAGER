"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Award, Plus, UserPlus, PencilLine, Trash2, FileText, Loader2, CheckCircle2,
  Circle, Download, Search, GraduationCap, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  createDiplomeFromInscription, createDiplomeManuel, setDiplomeStatut,
  setDiplomeNumero, deleteDiplome,
} from "@/lib/actions/diplome-actions";

type Statut = "ENVOYE_CERTIFICATEUR" | "RECU" | "REMIS";
type Row = {
  id: string; nom: string; prenom: string; dateNaissance: string | null;
  lieuNaissance: string | null; numeroDiplome: string | null; statut: Statut;
  ssiap: boolean;
  groupKey: string; groupLabel: string; groupDate: string | null;
  remiseParNom: string | null; remisAt: string | null;
};
type SessionOpt = {
  id: string; label: string; formationId: string; formationTitre: string;
  inscrits: { inscriptionId: string; nom: string; prenom: string; deja: boolean }[];
};
type FormationOpt = { id: string; titre: string };

const STATUTS: { key: Statut; label: string }[] = [
  { key: "ENVOYE_CERTIFICATEUR", label: "Envoyé au certificateur" },
  { key: "RECU", label: "Reçu" },
  { key: "REMIS", label: "Remis" },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function DiplomesManager({ diplomes, sessions, formations }: { diplomes: Row[]; sessions: SessionOpt[]; formations: FormationOpt[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<"inscrit" | "manuel" | null>(null);
  const [q, setQ] = useState("");

  // Formulaire "depuis un inscrit"
  const [sessionId, setSessionId] = useState("");
  const [inscriptionId, setInscriptionId] = useState("");
  const [numero, setNumero] = useState("");
  // Formulaire manuel
  const [man, setMan] = useState({ nom: "", prenom: "", dateNaissance: "", lieuNaissance: "", numeroDiplome: "", sessionId: "", formationId: "" });

  const currentSession = sessions.find((s) => s.id === sessionId);

  function run(key: string, p: Promise<{ ok: boolean; error?: string }>, okMsg: string, after?: () => void) {
    setBusy(key);
    startTransition(async () => {
      const r = await p;
      setBusy(null);
      if (r.ok) { toast.success(okMsg); after?.(); router.refresh(); }
      else toast.error(r.error ?? "Action impossible.");
    });
  }

  function addFromInscrit() {
    if (!inscriptionId) { toast.error("Choisissez un inscrit."); return; }
    run("add", createDiplomeFromInscription(inscriptionId, numero), "Diplôme enregistré.", () => {
      setInscriptionId(""); setNumero(""); setMode(null);
    });
  }
  function addManuel() {
    if (!man.nom.trim() || !man.prenom.trim()) { toast.error("Nom et prénom requis."); return; }
    if (!man.formationId) { toast.error("Précisez la formation du diplôme."); return; }
    run("add", createDiplomeManuel(man), "Diplôme enregistré.", () => {
      setMan({ nom: "", prenom: "", dateNaissance: "", lieuNaissance: "", numeroDiplome: "", sessionId: "", formationId: "" });
      setMode(null);
    });
  }

  // Recherche par nom/prénom, puis regroupement PAR SESSION (session la plus récente
  // en tête ; les diplômes sans session en fin de liste).
  const filtered = useMemo(() => {
    const needle = norm(q.trim());
    if (!needle) return diplomes;
    return diplomes.filter((d) => norm(`${d.prenom} ${d.nom}`).includes(needle));
  }, [q, diplomes]);

  const groups = useMemo(() => {
    const m = new Map<string, { key: string; label: string; date: string | null; rows: Row[] }>();
    for (const d of filtered) {
      const g = m.get(d.groupKey) ?? { key: d.groupKey, label: d.groupLabel, date: d.groupDate, rows: [] };
      g.rows.push(d);
      m.set(d.groupKey, g);
    }
    const arr = [...m.values()];
    for (const g of arr) g.rows.sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom));
    arr.sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return a.label.localeCompare(b.label);
    });
    return arr;
  }, [filtered]);

  const aNumeroterTotal = useMemo(() => diplomes.filter((d) => !d.numeroDiplome).length, [diplomes]);

  return (
    <div className="space-y-6">
      {/* Ajout */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4 text-primary" /> Enregistrer un diplôme
          </h3>
          <Button size="sm" variant={mode === "inscrit" ? "default" : "outline"} onClick={() => setMode(mode === "inscrit" ? null : "inscrit")}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Depuis un inscrit
          </Button>
          <Button size="sm" variant={mode === "manuel" ? "default" : "outline"} onClick={() => setMode(mode === "manuel" ? null : "manuel")}>
            <PencilLine className="mr-1.5 h-4 w-4" /> Saisie manuelle
          </Button>
        </div>

        {mode === "inscrit" && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select className="h-9 rounded-md border bg-transparent px-3 text-sm" value={sessionId}
              onChange={(e) => { setSessionId(e.target.value); setInscriptionId(""); }}>
              <option value="">— Session —</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-transparent px-3 text-sm" value={inscriptionId}
              onChange={(e) => setInscriptionId(e.target.value)} disabled={!currentSession}>
              <option value="">— Inscrit —</option>
              {currentSession?.inscrits.map((i) => (
                <option key={i.inscriptionId} value={i.inscriptionId} disabled={i.deja}>
                  {i.prenom} {i.nom}{i.deja ? " (déjà)" : ""}
                </option>
              ))}
            </select>
            <Input placeholder="N° du diplôme (facultatif)" value={numero} onChange={(e) => setNumero(e.target.value)} />
            <Button onClick={addFromInscrit} disabled={isPending}>
              {busy === "add" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              Enregistrer
            </Button>
            <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
              Les coordonnées (nom, prénom, date &amp; lieu de naissance) sont récupérées automatiquement depuis l&apos;inscrit.
              Pour un diplôme SSIAP, laissez le numéro vide : il se saisit ensuite ci-dessous (séquence du PV).
            </p>
          </div>
        )}

        {mode === "manuel" && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Input placeholder="Prénom" value={man.prenom} onChange={(e) => setMan({ ...man, prenom: e.target.value })} />
            <Input placeholder="Nom" value={man.nom} onChange={(e) => setMan({ ...man, nom: e.target.value })} />
            {/* Formation OBLIGATOIRE en saisie manuelle */}
            <select
              className={`h-9 rounded-md border bg-transparent px-3 text-sm ${man.formationId ? "" : "border-warning"}`}
              value={man.formationId}
              onChange={(e) => setMan({ ...man, formationId: e.target.value })}
            >
              <option value="">— Formation (obligatoire) —</option>
              {formations.map((f) => <option key={f.id} value={f.id}>{f.titre}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-transparent px-3 text-sm" value={man.sessionId}
              onChange={(e) => setMan({ ...man, sessionId: e.target.value })}>
              <option value="">— Session (facultatif) —</option>
              {sessions.filter((s) => !man.formationId || s.formationId === man.formationId).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <Input type="date" value={man.dateNaissance} onChange={(e) => setMan({ ...man, dateNaissance: e.target.value })} />
            <Input placeholder="Lieu de naissance" value={man.lieuNaissance} onChange={(e) => setMan({ ...man, lieuNaissance: e.target.value })} />
            <Input placeholder="N° du diplôme (facultatif)" value={man.numeroDiplome} onChange={(e) => setMan({ ...man, numeroDiplome: e.target.value })} />
            <Button onClick={addManuel} disabled={isPending} className="sm:col-span-2 lg:col-span-1">
              {busy === "add" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        )}
      </div>

      {/* Liste */}
      {diplomes.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          <Award className="mx-auto mb-2 h-8 w-8" /> Aucun diplôme enregistré pour l&apos;instant.
        </div>
      ) : (
        <>
          {/* Recherche + compteur */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher un diplôme par nom ou prénom…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <p className="shrink-0 text-xs text-muted-foreground">
              {diplomes.length} diplôme{diplomes.length > 1 ? "s" : ""}
              {aNumeroterTotal > 0 ? ` · ${aNumeroterTotal} à numéroter` : ""}
            </p>
          </div>

          {groups.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
              Aucun diplôme ne correspond à «&nbsp;{q}&nbsp;».
            </div>
          ) : (
            groups.map((g) => {
              const aNum = g.rows.filter((r) => !r.numeroDiplome).length;
              return (
                <div key={g.key} className="overflow-hidden rounded-lg border bg-card">
                  <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
                    <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                    <h3 className="text-sm font-semibold">{g.label}</h3>
                    <span className="text-xs text-muted-foreground">
                      · {g.rows.length} diplôme{g.rows.length > 1 ? "s" : ""}
                    </span>
                    {aNum > 0 && <Badge variant="warning" className="ml-auto">{aNum} à numéroter</Badge>}
                  </div>
                  <ul className="divide-y">
                    {g.rows.map((d) => (
                      <DiplomeRow key={d.id} d={d} busy={busy} isPending={isPending} run={run} />
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

function DiplomeRow({
  d, busy, isPending, run,
}: {
  d: Row; busy: string | null; isPending: boolean;
  run: (k: string, p: Promise<{ ok: boolean; error?: string }>, okMsg: string, after?: () => void) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [seq, setSeq] = useState("");
  const idx = STATUTS.findIndex((s) => s.key === d.statut);

  function openEdit() {
    // SSIAP : le champ = la séquence du PV (le reste est composé) → on part vide.
    // Autre diplôme : on pré-remplit le numéro existant pour le corriger.
    setSeq(d.ssiap ? "" : d.numeroDiplome ?? "");
    setEditing(true);
  }
  function save() {
    if (!seq.trim()) return;
    run("num" + d.id, setDiplomeNumero(d.id, seq), "Numéro enregistré.", () => {
      setEditing(false);
      setSeq("");
    });
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{d.prenom} {d.nom}</span>
          {!d.numeroDiplome && <Badge variant="warning">À numéroter</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">
          {d.dateNaissance ? `Né(e) le ${new Date(d.dateNaissance).toLocaleDateString("fr-FR")}` : "Date de naissance —"}
          {d.lieuNaissance ? ` à ${d.lieuNaissance}` : ""}
        </div>

        {/* Numéro / éditeur de séquence */}
        {editing ? (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Input
              autoFocus
              className="h-8 w-44"
              placeholder={d.ssiap ? "Séquence (n° du PV)" : "N° du diplôme"}
              value={seq}
              onChange={(e) => setSeq(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <Button size="sm" className="h-8" onClick={save} disabled={isPending || !seq.trim()}>
              {busy === "num" + d.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
              Valider
            </Button>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setEditing(false)}>
              Annuler
            </button>
            {d.ssiap && (
              <p className="w-full text-[11px] leading-snug text-muted-foreground">
                Numéro complet composé automatiquement :{" "}
                <span className="font-mono">département-agrément-niveau-année-séquence</span>.
              </p>
            )}
          </div>
        ) : d.numeroDiplome ? (
          <button
            type="button"
            onClick={openEdit}
            title="Modifier le numéro"
            className="group -ml-1.5 inline-flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 hover:border-border hover:bg-muted/50"
          >
            <span className="font-mono text-sm text-foreground">{d.numeroDiplome}</span>
            <PencilLine className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ) : (
          <Button size="sm" variant="outline" className="h-7" onClick={openEdit}>
            <PencilLine className="mr-1.5 h-3.5 w-3.5" />
            {d.ssiap ? "Saisir la séquence (PV)" : "Saisir le numéro"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {/* Stepper de statut */}
        <div className="flex items-center gap-1">
          {STATUTS.map((s, i) => {
            const done = i <= idx;
            return (
              <button key={s.key} type="button" disabled={isPending}
                onClick={() => run("st" + d.id, setDiplomeStatut(d.id, s.key), `Statut : ${s.label}.`)}
                title={s.label}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                  done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}>
                {done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Diplôme officiel (PDF) : trame SSIAP 1/2/3 uniquement, dès qu'un n° est saisi. */}
        {d.numeroDiplome && d.ssiap && (
          <a href={`/diplomes/${d.id}/officiel`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
            <Download className="h-3.5 w-3.5" /> Diplôme
          </a>
        )}
        {d.statut === "REMIS" && (
          <a href={`/diplomes/${d.id}/attestation`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted">
            <FileText className="h-3.5 w-3.5" /> Remise
          </a>
        )}
        <button type="button" disabled={isPending} title="Supprimer le diplôme"
          onClick={() => run("del" + d.id, deleteDiplome(d.id), "Diplôme supprimé.")}
          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          {busy === "del" + d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </li>
  );
}
