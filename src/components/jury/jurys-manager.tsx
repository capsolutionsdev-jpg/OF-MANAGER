"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Gavel, Plus, UserPlus, Trash2, FileText, Mail, Loader2, Check, Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createJury, toggleJuryActif, deleteJury, affecterJury, setAffectationPrix,
  setAffectationStatut, removeAffectation, sendDefraiement,
} from "@/lib/actions/jury-actions";

type Jure = { id: string; nom: string; prenom: string; email: string | null; telephone: string | null; qualite: string | null; actif: boolean };
type SessionOpt = { id: string; label: string; nbJury: number | null; dateExamen: string };
type Affect = {
  id: string; sessionId: string; sessionLabel: string; juryNom: string; juryEmail: string | null;
  juryQualite: string | null; prixEuros: string; natureExamen: string | null;
  statut: "A_PAYER" | "PAYE"; defraiementSent: boolean;
};

export function JurysManager({ jurys, sessions, affectations }: { jurys: Jure[]; sessions: SessionOpt[]; affectations: Affect[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const [nj, setNj] = useState({ nom: "", prenom: "", email: "", telephone: "", qualite: "" });
  const [af, setAf] = useState({ sessionId: "", juryId: "", prixEuros: "", natureExamen: "", dateExamen: "" });

  function run(key: string, p: Promise<{ ok: boolean; error?: string }>, okMsg: string, after?: () => void) {
    setBusy(key);
    startTransition(async () => {
      const r = await p; setBusy(null);
      if (r.ok) { toast.success(okMsg); after?.(); router.refresh(); } else toast.error(r.error ?? "Action impossible.");
    });
  }

  function addJure() {
    if (!nj.nom.trim() || !nj.prenom.trim()) { toast.error("Nom et prénom requis."); return; }
    run("j", createJury(nj), "Juré ajouté.", () => setNj({ nom: "", prenom: "", email: "", telephone: "", qualite: "" }));
  }
  function addAffect() {
    if (!af.sessionId || !af.juryId) { toast.error("Session et juré requis."); return; }
    run("a", affecterJury(af), "Juré affecté.", () => setAf({ sessionId: "", juryId: "", prixEuros: "", natureExamen: "", dateExamen: "" }));
  }

  // Regroupement des affectations par session
  const groups = new Map<string, Affect[]>();
  for (const a of affectations) (groups.get(a.sessionLabel) ?? groups.set(a.sessionLabel, []).get(a.sessionLabel)!).push(a);

  const totalDu = affectations.filter((a) => a.statut === "A_PAYER").reduce((s, a) => s + parseFloat(a.prixEuros || "0"), 0);
  const totalPaye = affectations.filter((a) => a.statut === "PAYE").reduce((s, a) => s + parseFloat(a.prixEuros || "0"), 0);
  const selectedSession = sessions.find((s) => s.id === af.sessionId);

  return (
    <div className="space-y-6">
      {/* Résumé paiements */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">À payer</div>
          <div className="text-xl font-bold text-amber-700">{totalDu.toFixed(2)} €</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Payé</div>
          <div className="text-xl font-bold text-emerald-700">{totalPaye.toFixed(2)} €</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Affectations</div>
          <div className="text-xl font-bold">{affectations.length}</div>
        </div>
      </div>

      {/* Affecter un juré à une session */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4 text-primary" /> Affecter un juré à une session
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <select className="h-9 rounded-md border bg-transparent px-3 text-sm" value={af.sessionId}
            onChange={(e) => { const s = sessions.find((x) => x.id === e.target.value); setAf({ ...af, sessionId: e.target.value, dateExamen: s?.dateExamen ?? "" }); }}>
            <option value="">— Session —</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}{s.nbJury ? ` (${s.nbJury} jurés)` : ""}</option>)}
          </select>
          <select className="h-9 rounded-md border bg-transparent px-3 text-sm" value={af.juryId}
            onChange={(e) => setAf({ ...af, juryId: e.target.value })}>
            <option value="">— Juré —</option>
            {jurys.filter((j) => j.actif).map((j) => <option key={j.id} value={j.id}>{j.prenom} {j.nom}</option>)}
          </select>
          <Input placeholder="Prix (€)" inputMode="decimal" value={af.prixEuros} onChange={(e) => setAf({ ...af, prixEuros: e.target.value })} />
          <Input placeholder="Nature de l'examen" value={af.natureExamen} onChange={(e) => setAf({ ...af, natureExamen: e.target.value })} />
          <Button onClick={addAffect} disabled={isPending}>
            {busy === "a" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />} Affecter
          </Button>
        </div>
        {selectedSession && <p className="mt-2 text-xs text-muted-foreground">Date d&apos;examen : {selectedSession.dateExamen} — le prix (défraiement) est personnalisable par juré.</p>}
      </div>

      {/* Affectations par session */}
      {affectations.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          <Gavel className="mx-auto mb-2 h-8 w-8" /> Aucun juré affecté pour l&apos;instant.
        </div>
      ) : (
        [...groups.entries()].map(([label, list]) => (
          <div key={label} className="rounded-lg border">
            <div className="border-b bg-muted/30 px-4 py-2 text-sm font-semibold">{label}</div>
            <ul className="divide-y">
              {list.map((a) => (
                <AffectRow key={a.id} a={a} busy={busy} isPending={isPending} run={run} />
              ))}
            </ul>
          </div>
        ))
      )}

      {/* Annuaire des jurés */}
      <div className="rounded-lg border">
        <div className="border-b bg-muted/30 px-4 py-2 text-sm font-semibold">Annuaire des jurés ({jurys.length})</div>
        <div className="p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <Input placeholder="Prénom" value={nj.prenom} onChange={(e) => setNj({ ...nj, prenom: e.target.value })} />
            <Input placeholder="Nom" value={nj.nom} onChange={(e) => setNj({ ...nj, nom: e.target.value })} />
            <Input placeholder="E-mail" value={nj.email} onChange={(e) => setNj({ ...nj, email: e.target.value })} />
            <Input placeholder="Téléphone" value={nj.telephone} onChange={(e) => setNj({ ...nj, telephone: e.target.value })} />
            <Input placeholder="Qualité / titre" value={nj.qualite} onChange={(e) => setNj({ ...nj, qualite: e.target.value })} />
            <Button onClick={addJure} disabled={isPending}>
              {busy === "j" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />} Ajouter
            </Button>
          </div>
          {jurys.length > 0 && (
            <ul className="mt-3 divide-y rounded-md border">
              {jurys.map((j) => (
                <li key={j.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className={j.actif ? "" : "text-muted-foreground line-through"}>
                    {j.prenom} {j.nom}{j.qualite ? ` — ${j.qualite}` : ""}{j.email ? ` · ${j.email}` : ""}
                  </span>
                  <span className="flex items-center gap-2">
                    <button title={j.actif ? "Désactiver" : "Activer"} disabled={isPending}
                      onClick={() => run("tj" + j.id, toggleJuryActif(j.id), "Mis à jour.")}
                      className="text-muted-foreground hover:text-foreground"><Power className="h-4 w-4" /></button>
                    <button title="Supprimer" disabled={isPending}
                      onClick={() => run("dj" + j.id, deleteJury(j.id), "Juré supprimé.")}
                      className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AffectRow({
  a, busy, isPending, run,
}: {
  a: Affect; busy: string | null; isPending: boolean;
  run: (k: string, p: Promise<{ ok: boolean; error?: string }>, okMsg: string, after?: () => void) => void;
}) {
  const [prix, setPrix] = useState(a.prixEuros);
  const paye = a.statut === "PAYE";

  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium">{a.juryNom}{a.juryQualite ? <span className="text-muted-foreground"> — {a.juryQualite}</span> : ""}</div>
        <div className="text-xs text-muted-foreground">
          {a.natureExamen || "Épreuve de certification"}{a.juryEmail ? ` · ${a.juryEmail}` : " · pas d'e-mail"}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1">
          <Input className="h-8 w-24" inputMode="decimal" value={prix} onChange={(e) => setPrix(e.target.value)}
            onBlur={() => { if (prix !== a.prixEuros) run("p" + a.id, setAffectationPrix(a.id, prix), "Prix mis à jour."); }} />
          <span className="text-sm text-muted-foreground">€</span>
        </span>
        <button type="button" disabled={isPending}
          onClick={() => run("s" + a.id, setAffectationStatut(a.id, paye ? "A_PAYER" : "PAYE"), paye ? "Marqué à payer." : "Marqué payé.")}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${paye ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
          <Check className="h-3 w-3" /> {paye ? "Payé" : "À payer"}
        </button>
        <a href={`/jurys/affectation/${a.id}/defraiement`} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-primary hover:bg-muted">
          <FileText className="h-3.5 w-3.5" /> Note
        </a>
        <Button size="sm" variant="outline" disabled={isPending || !a.juryEmail}
          onClick={() => run("m" + a.id, sendDefraiement(a.id), "Note de défraiement envoyée.")}
          title={a.juryEmail ? "Envoyer la note par e-mail" : "Le juré n'a pas d'e-mail"}>
          {busy === "m" + a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-1 h-3.5 w-3.5" />}
          {a.defraiementSent ? "Renvoyer" : "Envoyer"}
        </Button>
        <button type="button" disabled={isPending} title="Retirer"
          onClick={() => run("r" + a.id, removeAffectation(a.id), "Affectation retirée.")}
          className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
