"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Check, X, Trash2, MoreHorizontal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { createValidation, decideValidation, deleteValidation } from "@/lib/actions/validation-actions";

export const TYPES = [
  { value: "DOSSIER", label: "Dossier candidat" },
  { value: "INSCRIPTION", label: "Inscription" },
  { value: "TACHE_CANDIDAT", label: "Tâche candidat" },
  { value: "PAIEMENT", label: "Paiement" },
  { value: "DEPENSE", label: "Dépense" },
  { value: "AUTRE", label: "Autre" },
] as const;
const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

export type ValidationRow = {
  id: string;
  type: string;
  titre: string;
  description: string | null;
  lienHref: string | null;
  statut: "EN_ATTENTE" | "VALIDE" | "REFUSE";
  createdByNom: string | null;
  valideParNom: string | null;
  motifRefus: string | null;
  createdAt: string;
  decidedAt: string | null;
};

const inputCx =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");

export function ValidationsManager({ items, canValidate }: { items: ValidationRow[]; canValidate: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [refus, setRefus] = useState<ValidationRow | null>(null);
  const [typeF, setTypeF] = useState("");
  const [isPending, startTransition] = useTransition();

  const enAttente = useMemo(() => items.filter((i) => i.statut === "EN_ATTENTE" && (!typeF || i.type === typeF)), [items, typeF]);
  const historique = useMemo(() => items.filter((i) => i.statut !== "EN_ATTENTE" && (!typeF || i.type === typeF)), [items, typeF]);

  function run(p: Promise<{ ok: boolean; error?: string }>, msg: string) {
    startTransition(async () => {
      const r = await p;
      if (r.ok) { toast.success(msg); router.refresh(); }
      else toast.error(r.error ?? "Action impossible.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select value={typeF} onChange={(e) => setTypeF(e.target.value)} className={inputCx + " w-52"}>
          <option value="">Tous les types</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Nouvelle demande
        </Button>
      </div>

      <Tabs defaultValue="attente" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attente">À valider ({enAttente.length})</TabsTrigger>
          <TabsTrigger value="historique">Historique ({historique.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="attente">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Intitulé</TableHead>
                  <TableHead>Demandé par</TableHead>
                  <TableHead>Le</TableHead>
                  <TableHead className="w-28 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enAttente.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Rien à valider. 🎉</TableCell></TableRow>
                ) : enAttente.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell><Badge variant="outline" className="text-[10px]">{TYPE_LABEL[i.type] ?? i.type}</Badge></TableCell>
                    <TableCell>
                      <div className="font-medium">{i.titre}</div>
                      {i.description && <div className="text-xs text-muted-foreground">{i.description}</div>}
                      {i.lienHref && (
                        <a href={i.lienHref} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> Voir
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{i.createdByNom ?? "—"}</TableCell>
                    <TableCell className="text-sm">{fmt(i.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {canValidate ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-8 text-emerald-700 dark:text-emerald-300" onClick={() => run(decideValidation(i.id, "VALIDE"), "Validé.")}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-rose-700 dark:text-rose-300" onClick={() => setRefus(i)}>
                            <X className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => run(deleteValidation(i.id), "Supprimé.")}>
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Lecture seule</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!canValidate && (
            <p className="mt-2 text-xs text-muted-foreground">
              Vous pouvez soumettre des demandes. Le droit de <strong>valider</strong> doit vous être accordé
              par un administrateur (section « Validations »).
            </p>
          )}
        </TabsContent>

        <TabsContent value="historique">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Intitulé</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Validé par</TableHead>
                  <TableHead>Le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historique.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Aucun historique.</TableCell></TableRow>
                ) : historique.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell><Badge variant="outline" className="text-[10px]">{TYPE_LABEL[i.type] ?? i.type}</Badge></TableCell>
                    <TableCell>
                      <div className="font-medium">{i.titre}</div>
                      {i.statut === "REFUSE" && i.motifRefus && <div className="text-xs text-rose-600">Motif : {i.motifRefus}</div>}
                    </TableCell>
                    <TableCell>
                      {i.statut === "VALIDE"
                        ? <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300">Validé</Badge>
                        : <Badge variant="outline" className="text-rose-700 dark:text-rose-300">Refusé</Badge>}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{i.valideParNom ?? "—"}</TableCell>
                    <TableCell className="text-sm">{fmt(i.decidedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <NewDemandeDialog open={open} onOpenChange={setOpen} onDone={() => router.refresh()} />
      <RefusDialog item={refus} onClose={() => setRefus(null)} onDone={() => router.refresh()} />
      {isPending && <p className="text-xs text-muted-foreground">Traitement…</p>}
    </div>
  );
}

function NewDemandeDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const blank = { type: "DOSSIER", titre: "", description: "", lienHref: "" };
  const [form, setForm] = useState(blank);
  function submit() {
    startTransition(async () => {
      const r = await createValidation({
        type: form.type as "DOSSIER" | "INSCRIPTION" | "TACHE_CANDIDAT" | "PAIEMENT" | "DEPENSE" | "AUTRE",
        titre: form.titre, description: form.description, lienHref: form.lienHref,
      });
      if (r.ok) { toast.success("Demande soumise."); onDone(); setForm(blank); onOpenChange(false); }
      else toast.error(r.error);
    });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle demande de validation</DialogTitle>
          <DialogDescription>Soumet une action à valider par une personne habilitée.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="v-type">Type</Label>
            <select id="v-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCx}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="v-titre">Intitulé</Label>
            <Input id="v-titre" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex. Dossier de M. Diallo à valider" />
          </div>
          <div>
            <Label htmlFor="v-desc">Description (facultatif)</Label>
            <Textarea id="v-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label htmlFor="v-lien">Lien (facultatif)</Label>
            <Input id="v-lien" value={form.lienHref} onChange={(e) => setForm({ ...form, lienHref: e.target.value })} placeholder="/candidats/…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Annuler</Button>
            <Button onClick={submit} disabled={isPending}>{isPending ? "Envoi…" : "Soumettre"}</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RefusDialog({ item, onClose, onDone }: { item: ValidationRow | null; onClose: () => void; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [motif, setMotif] = useState("");
  if (!item) return null;
  function submit() {
    startTransition(async () => {
      const r = await decideValidation(item!.id, "REFUSE", motif);
      if (r.ok) { toast.success("Refusé."); onDone(); setMotif(""); onClose(); }
      else toast.error(r.error);
    });
  }
  return (
    <Dialog open={!!item} onOpenChange={(v) => { if (!v) { setMotif(""); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refuser la demande</DialogTitle>
          <DialogDescription>{item.titre}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="v-motif">Motif du refus</Label>
            <Textarea id="v-motif" value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} placeholder="Expliquez ce qui doit être corrigé…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>Annuler</Button>
            <Button onClick={submit} disabled={isPending} className="bg-rose-600 hover:bg-rose-700">
              {isPending ? "…" : "Confirmer le refus"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
