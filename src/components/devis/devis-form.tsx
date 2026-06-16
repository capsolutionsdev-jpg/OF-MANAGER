"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { createDevis } from "@/lib/actions/devis-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Line = { designation: string; quantite: string; puHT: string };
const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function DevisForm({
  entreprises,
}: {
  entreprises: { id: string; raisonSociale: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [entrepriseId, setEntrepriseId] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [objet, setObjet] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [tva, setTva] = useState("20");
  const [lignes, setLignes] = useState<Line[]>([{ designation: "", quantite: "1", puHT: "" }]);

  const num = (s: string) => {
    const n = parseFloat(s.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const totalHT = lignes.reduce((s, l) => s + num(l.quantite) * num(l.puHT), 0);
  const totalTVA = totalHT * (num(tva) / 100);
  const totalTTC = totalHT + totalTVA;
  const euro = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

  const setLine = (i: number, patch: Partial<Line>) =>
    setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const addLine = () => setLignes((ls) => [...ls, { designation: "", quantite: "1", puHT: "" }]);
  const delLine = (i: number) =>
    setLignes((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));

  function submit() {
    startTransition(async () => {
      const res = await createDevis({
        entrepriseId: entrepriseId || undefined,
        clientNom,
        clientEmail,
        objet,
        validUntil,
        tva: num(tva),
        lignes: lignes
          .filter((l) => l.designation.trim())
          .map((l) => ({ designation: l.designation.trim(), quantite: num(l.quantite), puHT: num(l.puHT) })),
      });
      if (res.ok) {
        toast.success("Devis créé.");
        router.push(`/devis/${res.id}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="entreprise">Entreprise cliente</Label>
            <select
              id="entreprise"
              className={selectClass}
              value={entrepriseId}
              onChange={(e) => setEntrepriseId(e.target.value)}
            >
              <option value="">— Aucune (client libre) —</option>
              {entreprises.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.raisonSociale}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="objet">Objet du devis</Label>
            <Input id="objet" value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Formation SST — 5 salariés" />
          </div>
          {!entrepriseId && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="clientNom">Nom du client</Label>
                <Input id="clientNom" value={clientNom} onChange={(e) => setClientNom(e.target.value)} placeholder="Prénom NOM" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientEmail">E-mail du client</Label>
                <Input id="clientEmail" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="validUntil">Valable jusqu&apos;au</Label>
            <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tva">TVA (%)</Label>
            <Input id="tva" type="number" step="0.1" value={tva} onChange={(e) => setTva(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lignes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lignes.map((l, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_120px_120px_40px] sm:items-end">
              <div className="space-y-1.5">
                {i === 0 && <Label>Désignation</Label>}
                <Input value={l.designation} onChange={(e) => setLine(i, { designation: e.target.value })} placeholder="Prestation…" />
              </div>
              <div className="space-y-1.5">
                {i === 0 && <Label>Qté</Label>}
                <Input type="number" step="0.01" value={l.quantite} onChange={(e) => setLine(i, { quantite: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                {i === 0 && <Label>PU HT</Label>}
                <Input type="number" step="0.01" value={l.puHT} onChange={(e) => setLine(i, { puHT: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                {i === 0 && <Label>Total HT</Label>}
                <div className="flex h-9 items-center px-1 text-sm font-medium tabular-nums">
                  {euro(num(l.quantite) * num(l.puHT))}
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => delLine(i)} aria-label="Supprimer la ligne">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-1.5 h-4 w-4" /> Ajouter une ligne
          </Button>

          <div className="ml-auto max-w-xs space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total HT</span><span className="font-medium tabular-nums">{euro(totalHT)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">TVA ({num(tva)}%)</span><span className="tabular-nums">{euro(totalTVA)}</span></div>
            <div className="flex justify-between text-base font-bold"><span>Total TTC</span><span className="tabular-nums">{euro(totalTTC)}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
        <Button type="button" onClick={submit} disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Création…" : "Créer le devis"}
        </Button>
      </div>
    </div>
  );
}
