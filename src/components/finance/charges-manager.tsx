"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Trash2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { createDepense, setDepenseStatut, deleteDepense } from "@/lib/actions/depense-actions";

export const CATEGORIES: { value: string; label: string }[] = [
  { value: "LOYER", label: "Loyer" },
  { value: "ELECTRICITE", label: "Électricité" },
  { value: "TELEPHONIE", label: "Téléphonie" },
  { value: "FORMATEUR", label: "Formateur" },
  { value: "JURY_EXAMEN", label: "Jury d'examen" },
  { value: "VISITE_SITE", label: "Visite de site" },
  { value: "JURY_SSIAP", label: "Jury SSIAP" },
  { value: "DIPLOME", label: "Diplôme" },
  { value: "ADS", label: "Campagnes ADS" },
  { value: "FOURNITURE_BUREAU", label: "Fourniture bureau" },
  { value: "FRAIS_EXAMEN_VTC", label: "Frais examen VTC" },
  { value: "FOURNITURE_ALIMENTAIRE", label: "Fourniture alimentaire" },
  { value: "CARBURANT", label: "Carburant" },
  { value: "AUTRE", label: "Autre" },
];
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

export type ChargeRow = {
  id: string;
  date: string;
  categorie: string;
  categorieAutre: string | null;
  libelle: string | null;
  montantCents: number;
  numeroPiece: string | null;
  statut: "PAYE" | "EN_ATTENTE";
};

const inputCx =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const eur = (c: number) => (c / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");
const catLabel = (r: ChargeRow) => (r.categorie === "AUTRE" ? r.categorieAutre || "Autre" : CAT_LABEL[r.categorie] ?? r.categorie);

export function ChargesManager({ charges, months }: { charges: ChargeRow[]; months: { value: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mois, setMois] = useState("");
  const [cat, setCat] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      charges.filter((c) => {
        if (mois && !c.date.startsWith(mois)) return false;
        if (cat && c.categorie !== cat) return false;
        return true;
      }),
    [charges, mois, cat],
  );
  const total = filtered.reduce((a, c) => a + c.montantCents, 0);
  const enAttente = filtered.filter((c) => c.statut === "EN_ATTENTE").reduce((a, c) => a + c.montantCents, 0);

  function runAction(p: Promise<{ ok: boolean; error?: string }>, msg: string) {
    startTransition(async () => {
      const r = await p;
      if (r.ok) { toast.success(msg); router.refresh(); }
      else toast.error(r.error ?? "Action impossible.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select value={mois} onChange={(e) => setMois(e.target.value)} className={inputCx + " w-44"}>
            <option value="">Tous les mois</option>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCx + " w-52"}>
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu href="/tresorerie/export/charges" label="Exporter" size="sm" />
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Ajouter une dépense
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span>Total affiché : <strong>{eur(total)}</strong></span>
        {enAttente > 0 && <span className="text-amber-700">Dont en attente : {eur(enAttente)}</span>}
        <span className="text-muted-foreground">{filtered.length} ligne(s)</span>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead>N° pièce</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Aucune dépense. Cliquez « Ajouter une dépense ».
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{fmtDate(c.date)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{catLabel(c)}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.libelle ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.numeroPiece ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{eur(c.montantCents)}</TableCell>
                  <TableCell>
                    {c.statut === "PAYE"
                      ? <Badge variant="outline" className="text-emerald-700">Payé</Badge>
                      : <Badge variant="outline" className="text-amber-700">En attente</Badge>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {c.statut === "EN_ATTENTE" ? (
                          <DropdownMenuItem onClick={() => runAction(setDepenseStatut(c.id, "PAYE"), "Marqué payé.")}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Marquer payé
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => runAction(setDepenseStatut(c.id, "EN_ATTENTE"), "Marqué en attente.")}>
                            <Clock className="mr-2 h-4 w-4" /> Marquer en attente
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => runAction(deleteDepense(c.id), "Dépense supprimée.")}>
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddDepenseDialog open={open} onOpenChange={setOpen} onDone={() => router.refresh()} />
      {isPending && <p className="text-xs text-muted-foreground">Traitement…</p>}
    </div>
  );
}

function AddDepenseDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const blank = { date: today, categorie: "LOYER", categorieAutre: "", libelle: "", montantEuros: "", numeroPiece: "", statut: "PAYE", notes: "" };
  const [form, setForm] = useState<typeof blank>(blank);

  function submit() {
    startTransition(async () => {
      const r = await createDepense({
        date: new Date(form.date).toISOString(),
        categorie: form.categorie as CreateCat,
        categorieAutre: form.categorieAutre,
        libelle: form.libelle,
        montantEuros: Number(form.montantEuros),
        numeroPiece: form.numeroPiece,
        statut: form.statut as "PAYE" | "EN_ATTENTE",
        notes: form.notes,
      });
      if (r.ok) { toast.success("Dépense enregistrée."); onDone(); setForm(blank); onOpenChange(false); }
      else toast.error(r.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une dépense</DialogTitle>
          <DialogDescription>Charge du centre (rattachée au mois de la date).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="d-cat">Catégorie</Label>
              <select id="d-cat" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} className={inputCx}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="d-montant">Montant (€)</Label>
              <Input id="d-montant" type="number" min={0} step="0.01" value={form.montantEuros}
                onChange={(e) => setForm({ ...form, montantEuros: e.target.value })} />
            </div>
          </div>
          {form.categorie === "AUTRE" && (
            <div>
              <Label htmlFor="d-autre">Préciser la catégorie</Label>
              <Input id="d-autre" value={form.categorieAutre} onChange={(e) => setForm({ ...form, categorieAutre: e.target.value })} placeholder="Nom de la dépense" />
            </div>
          )}
          <div>
            <Label htmlFor="d-libelle">Libellé (facultatif)</Label>
            <Input id="d-libelle" value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="Description" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="d-date">Date</Label>
              <Input id="d-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="d-piece">N° pièce</Label>
              <Input id="d-piece" value={form.numeroPiece} onChange={(e) => setForm({ ...form, numeroPiece: e.target.value })} placeholder="Facture/reçu" />
            </div>
            <div>
              <Label htmlFor="d-statut">Statut</Label>
              <select id="d-statut" value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} className={inputCx}>
                <option value="PAYE">Payé</option>
                <option value="EN_ATTENTE">En attente</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Annuler</Button>
            <Button onClick={submit} disabled={isPending}>{isPending ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type CreateCat =
  | "LOYER" | "ELECTRICITE" | "TELEPHONIE" | "FORMATEUR" | "JURY_EXAMEN" | "VISITE_SITE"
  | "JURY_SSIAP" | "DIPLOME" | "ADS" | "FOURNITURE_BUREAU" | "FRAIS_EXAMEN_VTC"
  | "FOURNITURE_ALIMENTAIRE" | "CARBURANT" | "AUTRE";
