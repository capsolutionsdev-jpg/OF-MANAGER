"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createConventionEntreprise, type NouveauSalarie } from "@/lib/actions/convention-actions";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const FINANCEMENTS = [
  ["ENTREPRISE", "Entreprise (plan de dev.)"],
  ["OPCO", "OPCO"],
  ["AUTOFINANCEMENT", "Autofinancement"],
  ["AUTRE", "Autre"],
] as const;

/**
 * Dialogue de création d'une convention client pro (inscriptions groupées).
 * Deux points d'entrée :
 *  - depuis une SESSION : `sessionId` fixé, on choisit l'entreprise ;
 *  - depuis une ENTREPRISE : `entrepriseId` fixé, on choisit la session
 *    (et on peut piocher parmi ses candidats existants).
 */
export function ConventionDialog({
  sessionId,
  entrepriseId,
  entreprises = [],
  sessions = [],
  candidatsExistants = [],
  triggerLabel = "Convention entreprise",
}: {
  sessionId?: string;
  entrepriseId?: string;
  entreprises?: { id: string; raisonSociale: string }[];
  sessions?: { id: string; label: string }[];
  candidatsExistants?: { id: string; nom: string; prenom: string }[];
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [entId, setEntId] = useState(entrepriseId ?? "");
  const [sessId, setSessId] = useState(sessionId ?? "");
  const [financement, setFinancement] = useState("ENTREPRISE");
  const [montant, setMontant] = useState("");
  const [nouveaux, setNouveaux] = useState<NouveauSalarie[]>([{ nom: "", prenom: "", email: "" }]);
  const [existants, setExistants] = useState<string[]>([]);

  function setRow(i: number, patch: Partial<NouveauSalarie>) {
    setNouveaux((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function submit() {
    const cible = sessionId ?? sessId;
    const ent = entrepriseId ?? entId;
    if (!cible) return toast.error("Choisissez une session.");
    if (!ent) return toast.error("Choisissez un client professionnel.");
    const salaries = nouveaux.filter((n) => n.nom.trim() && n.prenom.trim());
    if (salaries.length === 0 && existants.length === 0)
      return toast.error("Ajoutez au moins un salarié.");

    start(async () => {
      const res = await createConventionEntreprise({
        sessionId: cible,
        entrepriseId: ent,
        nouveaux: salaries,
        candidatIdsExistants: existants,
        financementType: financement,
        montant,
      });
      if (res.ok) {
        toast.success(`Convention créée — ${res.inscrits} salarié(s) inscrit(s).`);
        setOpen(false);
        setNouveaux([{ nom: "", prenom: "", email: "" }]);
        setExistants([]);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Building2 className="mr-2 h-4 w-4" /> {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Convention entreprise — inscription groupée</DialogTitle>
            <DialogDescription>
              Les salariés deviennent des candidats rattachés à l&apos;entreprise et sont inscrits à
              la session. La convention démarre « en attente » ; sa signature confirme les inscriptions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cible : entreprise ou session selon le point d'entrée */}
            {!entrepriseId && (
              <div className="grid gap-1.5">
                <Label>Client professionnel</Label>
                <select className={selectClass} value={entId} onChange={(e) => setEntId(e.target.value)}>
                  <option value="">— Choisir —</option>
                  {entreprises.map((e) => (
                    <option key={e.id} value={e.id}>{e.raisonSociale}</option>
                  ))}
                </select>
              </div>
            )}
            {!sessionId && (
              <div className="grid gap-1.5">
                <Label>Session</Label>
                <select className={selectClass} value={sessId} onChange={(e) => setSessId(e.target.value)}>
                  <option value="">— Choisir —</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Financement</Label>
                <select className={selectClass} value={financement} onChange={(e) => setFinancement(e.target.value)}>
                  {FINANCEMENTS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="conv-montant">Montant convention (€ HT)</Label>
                <Input id="conv-montant" type="number" step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="ex. 3000" />
              </div>
            </div>

            {/* Candidats existants (si entreprise connue) */}
            {candidatsExistants.length > 0 && (
              <div className="grid gap-1.5">
                <Label>Salariés déjà en base</Label>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                  {candidatsExistants.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={existants.includes(c.id)}
                        onChange={() =>
                          setExistants((cur) =>
                            cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id],
                          )
                        }
                      />
                      {c.prenom} {c.nom}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Nouveaux salariés */}
            <div className="grid gap-1.5">
              <Label>Nouveaux salariés</Label>
              <div className="space-y-2">
                {nouveaux.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder="Prénom" value={row.prenom} onChange={(e) => setRow(i, { prenom: e.target.value })} />
                    <Input placeholder="Nom" value={row.nom} onChange={(e) => setRow(i, { nom: e.target.value })} />
                    <Input placeholder="E-mail (optionnel)" value={row.email ?? ""} onChange={(e) => setRow(i, { email: e.target.value })} />
                    <button
                      type="button"
                      onClick={() => setNouveaux((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r))}
                      className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted"
                      aria-label="Retirer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setNouveaux((r) => [...r, { nom: "", prenom: "", email: "" }])}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" /> Ajouter un salarié
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Annuler</Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Créer la convention & inscrire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
