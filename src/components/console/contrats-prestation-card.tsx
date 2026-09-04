"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { FileText, Send, Copy, Trash2, Plus, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TONE_CLASSES } from "@/components/ui/status-badge";
import { euros } from "@/lib/plans";
import { cn } from "@/lib/utils";
import {
  createContratPrestation,
  sendContratPrestation,
  deleteContratPrestation,
  type ContratPrestationState,
} from "@/lib/actions/contrat-prestation-actions";

export type ContratPrestationRow = {
  id: string;
  reference: string;
  formuleNom: string;
  montantNet: number;
  engagementLabel: string;
  statut: "BROUILLON" | "ENVOYE" | "SIGNE" | "REFUSE";
  token: string | null;
  signataireNom: string | null;
  signedAt: string | null;
};

const STATUT_BADGE: Record<string, string> = {
  BROUILLON: TONE_CLASSES.neutral,
  ENVOYE: TONE_CLASSES.warning,
  SIGNE: TONE_CLASSES.success,
  REFUSE: TONE_CLASSES.danger,
};
const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  SIGNE: "Signé",
  REFUSE: "Refusé",
};

export function ContratsPrestationCard({
  organismeId,
  contrats,
  formules,
}: {
  organismeId: string;
  contrats: ContratPrestationRow[];
  formules: { key: string; name: string; price: number }[];
}) {
  const [open, setOpen] = useState(contrats.length === 0);
  const [state, formAction, pending] = useActionState<ContratPrestationState | undefined, FormData>(
    createContratPrestation,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Contrat créé.");
      setOpen(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 py-3">
        <CardTitle className="text-sm text-muted-foreground">
          Contrats de prestation ({contrats.length})
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Nouveau contrat
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {contrats.length === 0 && !open && (
          <p className="text-sm text-muted-foreground">Aucun contrat pour ce client.</p>
        )}

        {contrats.map((c) => (
          <ContratRow key={c.id} organismeId={organismeId} c={c} />
        ))}

        {open && (
          <form action={formAction} className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <input type="hidden" name="organismeId" value={organismeId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium">
                Formule
                <select name="formule" className="rounded-md border bg-background px-2 py-1.5 text-sm" defaultValue={formules[0]?.key}>
                  {formules.map((f) => (
                    <option key={f.key} value={f.key}>{f.name} — {euros(f.price)}/mois</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Engagement
                <select name="engagement" className="rounded-md border bg-background px-2 py-1.5 text-sm" defaultValue="MENSUEL">
                  <option value="MENSUEL">Mensuel, sans engagement</option>
                  <option value="ANNUEL">Annuel (12 mois)</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Montant mensuel HT (€) <span className="font-normal text-muted-foreground">— vide = prix formule</span>
                <Input name="montantMensuel" type="number" step="0.01" min="0" placeholder="ex. 149" />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Remise (%)
                <Input name="remisePct" type="number" min="0" max="100" defaultValue="0" />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Date d&apos;effet
                <Input name="dateDebut" type="date" />
              </label>
              <label className="grid gap-1 text-xs font-medium sm:col-span-2">
                Options (une par ligne ou séparées par des virgules)
                <textarea name="options" rows={2} className="rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="Compte supplémentaire, Marque blanche…" />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                Créer le contrat
              </Button>
              {contrats.length > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function ContratRow({ organismeId, c }: { organismeId: string; c: ContratPrestationRow }) {
  const [pending, start] = useTransition();
  const confirm = useConfirm();

  function envoyer() {
    start(async () => {
      const res = await sendContratPrestation(c.id);
      toast[res.ok ? "success" : "error"](
        res.ok ? "Contrat prêt à signer — lien envoyé au client." : res.error ?? "Échec.",
      );
    });
  }
  async function supprimer() {
    const ok = await confirm({
      title: `Supprimer le contrat ${c.reference} ?`,
      description: "Cette suppression est définitive.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    start(() => deleteContratPrestation(c.id, organismeId));
  }
  function copierLien() {
    if (!c.token) return;
    const url = `${window.location.origin}/contrat-prestation/${c.token}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Lien de signature copié."));
  }

  return (
    <div className={cn("rounded-lg border p-3", pending && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{c.reference}</span>
        <Badge className={cn("text-[11px]", STATUT_BADGE[c.statut])}>{STATUT_LABEL[c.statut]}</Badge>
        <span className="text-sm text-muted-foreground">
          {c.formuleNom} · {euros(c.montantNet)}/mois · {c.engagementLabel}
        </span>
        {c.statut === "SIGNE" && c.signataireNom && (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> {c.signataireNom}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <a
          href={`/api/console/contrat-prestation/${c.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
        >
          <FileText className="h-3.5 w-3.5" /> PDF
        </a>
        {c.statut !== "SIGNE" && (
          <Button size="sm" variant="outline" onClick={envoyer} disabled={pending}>
            <Send className="mr-1 h-3.5 w-3.5" /> {c.statut === "ENVOYE" ? "Renvoyer" : "Envoyer pour signature"}
          </Button>
        )}
        {c.token && c.statut !== "SIGNE" && (
          <Button size="sm" variant="ghost" onClick={copierLien}>
            <Copy className="mr-1 h-3.5 w-3.5" /> Copier le lien
          </Button>
        )}
        {c.statut !== "SIGNE" && (
          <Button size="sm" variant="ghost" onClick={() => void supprimer()} disabled={pending} className="text-destructive hover:text-destructive/80">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
