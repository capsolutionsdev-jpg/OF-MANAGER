"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Award, Plus, UserPlus, PencilLine, Trash2, FileText, Loader2, CheckCircle2, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createDiplomeFromInscription, createDiplomeManuel, setDiplomeStatut,
  setDiplomeNumero, deleteDiplome,
} from "@/lib/actions/diplome-actions";

type Statut = "ENVOYE_CERTIFICATEUR" | "RECU" | "REMIS";
type Row = {
  id: string; nom: string; prenom: string; dateNaissance: string | null;
  lieuNaissance: string | null; numeroDiplome: string | null; statut: Statut;
  formationTitre: string | null; remiseParNom: string | null; remisAt: string | null;
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

export function DiplomesManager({ diplomes, sessions, formations }: { diplomes: Row[]; sessions: SessionOpt[]; formations: FormationOpt[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<"inscrit" | "manuel" | null>(null);

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

  // Regroupement par formation
  const groups = new Map<string, Row[]>();
  for (const d of diplomes) {
    const k = d.formationTitre ?? "Sans formation";
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(d);
  }

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
            <Input placeholder="N° du diplôme" value={numero} onChange={(e) => setNumero(e.target.value)} />
            <Button onClick={addFromInscrit} disabled={isPending}>
              {busy === "add" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              Enregistrer
            </Button>
            <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
              Les coordonnées (nom, prénom, date & lieu de naissance) sont récupérées automatiquement depuis l&apos;inscrit.
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
            <Input placeholder="N° du diplôme" value={man.numeroDiplome} onChange={(e) => setMan({ ...man, numeroDiplome: e.target.value })} />
            <Button onClick={addManuel} disabled={isPending} className="sm:col-span-2 lg:col-span-1">
              {busy === "add" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        )}
      </div>

      {/* Liste */}
      {diplomes.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          <Award className="mx-auto mb-2 h-8 w-8" /> Aucun diplôme enregistré pour l&apos;instant.
        </div>
      ) : (
        [...groups.entries()].map(([titre, list]) => (
          <div key={titre} className="rounded-lg border">
            <div className="border-b bg-muted/30 px-4 py-2 text-sm font-semibold">{titre} ({list.length})</div>
            <ul className="divide-y">
              {list.map((d) => (
                <DiplomeRow key={d.id} d={d} busy={busy} isPending={isPending} run={run} />
              ))}
            </ul>
          </div>
        ))
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
  const [editNum, setEditNum] = useState(false);
  const [num, setNum] = useState(d.numeroDiplome ?? "");
  const idx = STATUTS.findIndex((s) => s.key === d.statut);

  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="font-medium">{d.prenom} {d.nom}</div>
        <div className="text-xs text-muted-foreground">
          {d.dateNaissance ? `Né(e) le ${new Date(d.dateNaissance).toLocaleDateString("fr-FR")}` : "Naissance —"}
          {d.lieuNaissance ? ` à ${d.lieuNaissance}` : ""}
          {" · N° "}
          {editNum ? (
            <span className="inline-flex items-center gap-1">
              <Input className="inline-block h-6 w-32" value={num} onChange={(e) => setNum(e.target.value)} />
              <button className="text-primary" onClick={() => run("num" + d.id, setDiplomeNumero(d.id, num), "N° mis à jour.", () => setEditNum(false))}>OK</button>
            </span>
          ) : (
            <button className="underline decoration-dotted" onClick={() => setEditNum(true)}>
              {d.numeroDiplome || "à saisir"}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Stepper de statut */}
        <div className="flex items-center gap-1">
          {STATUTS.map((s, i) => {
            const done = i <= idx;
            return (
              <button key={s.key} type="button" disabled={isPending}
                onClick={() => run("st" + d.id, setDiplomeStatut(d.id, s.key), `Statut : ${s.label}.`)}
                title={s.label}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}>
                {done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                {s.label}
              </button>
            );
          })}
        </div>

        {d.statut === "REMIS" && (
          <a href={`/diplomes/${d.id}/attestation`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-primary hover:bg-muted">
            <FileText className="h-3.5 w-3.5" /> Attestation de remise
          </a>
        )}
        <button type="button" disabled={isPending} title="Supprimer"
          onClick={() => run("del" + d.id, deleteDiplome(d.id), "Diplôme supprimé.")}
          className="text-muted-foreground hover:text-destructive">
          {busy === "del" + d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </li>
  );
}
