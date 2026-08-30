"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarClock } from "lucide-react";
import {
  listerSessionsCibles,
  changerSessionInscription,
  type SessionCible,
} from "@/lib/actions/inscription-actions";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export function ChangerSessionDialog({
  inscriptionId,
  open,
  onOpenChange,
}: {
  inscriptionId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionCible[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected("");
    setSessions([]);
    listerSessionsCibles(inscriptionId).then((r) => {
      if (r.ok) setSessions(r.sessions);
      else toast.error(r.error);
      setLoading(false);
    });
  }, [open, inscriptionId]);

  function confirmer() {
    if (!selected) return;
    start(async () => {
      const r = await changerSessionInscription(inscriptionId, selected);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Candidat déplacé vers la nouvelle session.");
      if (r.warning) toast.warning(r.warning);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer de session</DialogTitle>
          <DialogDescription>
            Déplacer le candidat vers une autre session planifiée de la même formation. Ses règlements,
            factures et documents suivent l&apos;inscription.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des sessions…
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Aucune autre session planifiée pour cette formation.
          </p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto py-1">
            {sessions.map((s) => (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 ${
                  s.complet ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <input
                  type="radio"
                  name="cible"
                  value={s.id}
                  disabled={s.complet}
                  checked={selected === s.id}
                  onChange={() => setSelected(s.id)}
                  className="accent-[color:var(--primary)]"
                />
                <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">
                  Du {fmtDate(s.dateDebut)} au {fmtDate(s.dateFin)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.complet
                    ? "Complète"
                    : s.placesRestantes != null
                      ? `${s.placesRestantes} place${s.placesRestantes > 1 ? "s" : ""}`
                      : "Places libres"}
                </span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button disabled={!selected || pending} onClick={confirmer}>
            {pending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Déplacement…
              </>
            ) : (
              "Déplacer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
