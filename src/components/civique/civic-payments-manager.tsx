"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  MoreHorizontal,
  Undo2,
  Ban,
  CreditCard,
  Banknote,
  Search,
  Store,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportMenu } from "@/components/export-menu";
import {
  recordCivicPayment,
  refundCivicPayment,
  cancelCivicPayment,
  enrollAndPayCivic,
} from "@/lib/actions/civique-actions";

export type CivicPaymentRow = {
  id: string;
  date: string;
  eleve: string;
  email: string;
  mention: string;
  montantCents: number;
  methode: "STRIPE" | "CB_TPE" | "ESPECES" | "CHEQUE" | "VIREMENT";
  statut: string;
  factureId: string | null;
  factureNumero: string | null;
};
export type PayStudent = { id: string; label: string; mention: string | null };

const METHODE_LABEL: Record<string, string> = {
  STRIPE: "CB en ligne",
  CB_TPE: "CB (TPE)",
  ESPECES: "Espèces",
  CHEQUE: "Chèque",
  VIREMENT: "Virement",
};
const MENTION_SHORT: Record<string, string> = { CSP: "CSP", CR: "CR", NATURALISATION: "NAT" };
const inputCx =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const eur = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

function statutBadge(s: string) {
  if (s === "rembourse") return <Badge variant="outline" className="text-amber-700">Remboursé</Badge>;
  if (s === "annule") return <Badge variant="outline" className="text-muted-foreground">Annulé</Badge>;
  if (s === "en_attente") return <Badge variant="outline">En attente</Badge>;
  return <Badge variant="outline" className="text-emerald-700">Payé</Badge>;
}

export function CivicPaymentsManager({
  payments,
  students,
  tarifs,
}: {
  payments: CivicPaymentRow[];
  students: PayStudent[];
  tarifs: Record<string, number>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [guichetOpen, setGuichetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) =>
      `${p.eleve} ${p.email} ${p.factureNumero ?? ""}`.toLowerCase().includes(q),
    );
  }, [payments, query]);

  const stats = useMemo(() => {
    let encaisse = 0;
    let moisCa = 0;
    const m0 = new Date();
    m0.setDate(1);
    m0.setHours(0, 0, 0, 0);
    const parMethode: Record<string, number> = {};
    for (const p of payments) {
      if (p.statut !== "paye") continue;
      encaisse += p.montantCents;
      if (new Date(p.date) >= m0) moisCa += p.montantCents;
      parMethode[p.methode] = (parMethode[p.methode] ?? 0) + p.montantCents;
    }
    const count = payments.filter((p) => p.statut === "paye").length;
    return { encaisse, moisCa, count, panier: count ? Math.round(encaisse / count) : 0, parMethode };
  }, [payments]);

  function runAction(p: Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    startTransition(async () => {
      const r = await p;
      if (r.ok) {
        toast.success(okMsg);
        router.refresh();
      } else toast.error(r.error ?? "Action impossible.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Banknote} label="CA encaissé" value={eur(stats.encaisse)} />
        <Kpi icon={CreditCard} label="CA ce mois" value={eur(stats.moisCa)} />
        <Kpi icon={FileText} label="Paiements" value={String(stats.count)} />
        <Kpi icon={Wallet} label="Panier moyen" value={eur(stats.panier)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (élève, e-mail, n° facture)…"
            className={inputCx + " pl-8"}
          />
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu href="/examen-civique/export/comptable" label="Compta" size="sm" />
          <Button size="sm" variant="outline" onClick={() => setGuichetOpen(true)}>
            <Store className="mr-1.5 h-4 w-4" /> Inscription guichet
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Paiement
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Formation</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Facture</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Aucun paiement enregistré. Les paiements en ligne (Stripe) et physiques apparaîtront ici.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{fmtDate(p.date)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{p.eleve}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{MENTION_SHORT[p.mention] ?? p.mention}</Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{eur(p.montantCents)}</TableCell>
                  <TableCell className="text-sm">{METHODE_LABEL[p.methode] ?? p.methode}</TableCell>
                  <TableCell>{statutBadge(p.statut)}</TableCell>
                  <TableCell className="text-sm">
                    {p.factureId ? (
                      <a
                        href={`/examen-civique/facture/${p.factureId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" /> {p.factureNumero}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {p.factureId && (
                          <DropdownMenuItem onClick={() => window.open(`/examen-civique/facture/${p.factureId}`, "_blank")}>
                            <FileText className="mr-2 h-4 w-4" /> Télécharger la facture
                          </DropdownMenuItem>
                        )}
                        {p.statut === "paye" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => runAction(refundCivicPayment(p.id), "Paiement remboursé.")}>
                              <Undo2 className="mr-2 h-4 w-4" /> Marquer remboursé
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runAction(cancelCivicPayment(p.id), "Paiement annulé.")}>
                              <Ban className="mr-2 h-4 w-4" /> Annuler
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RecordPaymentDialog
        open={open}
        onOpenChange={setOpen}
        students={students}
        tarifs={tarifs}
        onDone={() => router.refresh()}
      />
      <GuichetDialog open={guichetOpen} onOpenChange={setGuichetOpen} tarifs={tarifs} onDone={() => router.refresh()} />
      {isPending && <p className="text-xs text-muted-foreground">Traitement…</p>}
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <p className="mt-2 text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  students,
  tarifs,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  students: PayStudent[];
  tarifs: Record<string, number>;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    candidatId: "",
    mention: "CSP",
    montantEuros: tarifs.CSP ?? 149,
    methode: "CB_TPE",
    date: today,
    notes: "",
  });
  const [done, setDone] = useState<{ numero: string | null; factureId?: string } | null>(null);

  function pickStudent(id: string) {
    const s = students.find((x) => x.id === id);
    const mention = s?.mention ?? form.mention;
    setForm((f) => ({ ...f, candidatId: id, mention, montantEuros: tarifs[mention] ?? f.montantEuros }));
  }
  function pickMention(mention: string) {
    setForm((f) => ({ ...f, mention, montantEuros: tarifs[mention] ?? f.montantEuros }));
  }

  function submit() {
    if (!form.candidatId) return toast.error("Sélectionnez un élève.");
    startTransition(async () => {
      const r = await recordCivicPayment({
        candidatId: form.candidatId,
        mention: form.mention as "CSP" | "CR" | "NATURALISATION",
        montantEuros: Number(form.montantEuros),
        methode: form.methode as "CB_TPE" | "ESPECES" | "CHEQUE" | "VIREMENT" | "STRIPE",
        date: new Date(form.date).toISOString(),
        notes: form.notes,
      });
      if (r.ok) {
        setDone({ numero: r.factureNumero });
        toast.success("Paiement enregistré.");
        onDone();
      } else toast.error(r.error);
    });
  }

  function close() {
    setDone(null);
    setForm({ candidatId: "", mention: "CSP", montantEuros: tarifs.CSP ?? 149, methode: "CB_TPE", date: today, notes: "" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <DialogDescription>Paiement physique (TPE, espèces, chèque, virement) — génère la facture.</DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-emerald-50 p-4 text-sm text-emerald-900">
              Paiement enregistré ✓{done.numero ? ` — facture ${done.numero}` : ""}.
            </div>
            <DialogFooter>
              <Button onClick={close}>Terminer</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="pay-student">Élève</Label>
              <select id="pay-student" value={form.candidatId} onChange={(e) => pickStudent(e.target.value)} className={inputCx}>
                <option value="">— Sélectionner —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              {students.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Créez d'abord un compte élève (onglet Élèves).</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pay-mention">Formation</Label>
                <select id="pay-mention" value={form.mention} onChange={(e) => pickMention(e.target.value)} className={inputCx}>
                  <option value="CSP">Carte de séjour (CSP)</option>
                  <option value="CR">Carte de résident (CR)</option>
                  <option value="NATURALISATION">Naturalisation</option>
                </select>
              </div>
              <div>
                <Label htmlFor="pay-montant">Montant (€)</Label>
                <Input id="pay-montant" type="number" min={0} step="1" value={form.montantEuros}
                  onChange={(e) => setForm({ ...form, montantEuros: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pay-methode">Mode de paiement</Label>
                <select id="pay-methode" value={form.methode} onChange={(e) => setForm({ ...form, methode: e.target.value })} className={inputCx}>
                  <option value="CB_TPE">Carte bancaire (TPE)</option>
                  <option value="ESPECES">Espèces</option>
                  <option value="CHEQUE">Chèque</option>
                  <option value="VIREMENT">Virement</option>
                </select>
              </div>
              <div>
                <Label htmlFor="pay-date">Date</Label>
                <Input id="pay-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="pay-notes">Note (facultatif)</Label>
              <Input id="pay-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Réf. chèque, remarque…" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Annuler</Button>
              <Button onClick={submit} disabled={isPending}>{isPending ? "Enregistrement…" : "Enregistrer"}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GuichetDialog({
  open,
  onOpenChange,
  tarifs,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tarifs: Record<string, number>;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const blank = {
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    mention: "CSP",
    montantEuros: tarifs.CSP ?? 149,
    methode: "CB_TPE",
    date: today,
    dureeJours: 30,
    notes: "",
    envoyerEmail: true,
  };
  const [form, setForm] = useState(blank);
  const [done, setDone] = useState<{ code: string; numero: string | null } | null>(null);

  function pickMention(mention: string) {
    setForm((f) => ({ ...f, mention, montantEuros: tarifs[mention] ?? f.montantEuros }));
  }
  function close() {
    setDone(null);
    setForm(blank);
    onOpenChange(false);
  }
  function submit() {
    startTransition(async () => {
      const r = await enrollAndPayCivic({
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        telephone: form.telephone,
        mention: form.mention as "CSP" | "CR" | "NATURALISATION",
        dureeJours: Number(form.dureeJours),
        envoyerEmail: form.envoyerEmail,
        montantEuros: Number(form.montantEuros),
        methode: form.methode as "CB_TPE" | "ESPECES" | "CHEQUE" | "VIREMENT" | "STRIPE",
        date: new Date(form.date).toISOString(),
        notes: form.notes,
      });
      if (r.ok) {
        setDone({ code: r.code, numero: r.factureNumero });
        toast.success("Inscription enregistrée.");
        onDone();
      } else toast.error(r.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscription au guichet</DialogTitle>
          <DialogDescription>Crée le compte, encaisse le paiement et génère la facture en une étape.</DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-medium">Inscription enregistrée ✓{done.numero ? ` — facture ${done.numero}` : ""}</p>
              <p className="mt-1">Code d'accès :</p>
              <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-xs">{done.code}</code>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(done.code).then(() => toast.success("Code copié."))}>
                Copier le code
              </Button>
              <Button onClick={close}>Terminer</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="g-prenom">Prénom</Label>
                <Input id="g-prenom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="g-nom">Nom</Label>
                <Input id="g-nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="g-email">E-mail</Label>
                <Input id="g-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="g-tel">Téléphone</Label>
                <Input id="g-tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="g-mention">Formation</Label>
                <select id="g-mention" value={form.mention} onChange={(e) => pickMention(e.target.value)} className={inputCx}>
                  <option value="CSP">Carte de séjour (CSP)</option>
                  <option value="CR">Carte de résident (CR)</option>
                  <option value="NATURALISATION">Naturalisation</option>
                </select>
              </div>
              <div>
                <Label htmlFor="g-montant">Montant (€)</Label>
                <Input id="g-montant" type="number" min={0} value={form.montantEuros}
                  onChange={(e) => setForm({ ...form, montantEuros: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label htmlFor="g-methode">Paiement</Label>
                <select id="g-methode" value={form.methode} onChange={(e) => setForm({ ...form, methode: e.target.value })} className={inputCx}>
                  <option value="CB_TPE">CB (TPE)</option>
                  <option value="ESPECES">Espèces</option>
                  <option value="CHEQUE">Chèque</option>
                  <option value="VIREMENT">Virement</option>
                </select>
              </div>
              <div>
                <Label htmlFor="g-date">Date</Label>
                <Input id="g-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="g-duree">Accès (j)</Label>
                <Input id="g-duree" type="number" min={1} max={365} value={form.dureeJours}
                  onChange={(e) => setForm({ ...form, dureeJours: Number(e.target.value) })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.envoyerEmail} onChange={(e) => setForm({ ...form, envoyerEmail: e.target.checked })} />
              Envoyer le code d'accès par e-mail
            </label>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Annuler</Button>
              <Button onClick={submit} disabled={isPending}>{isPending ? "Enregistrement…" : "Inscrire & encaisser"}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
