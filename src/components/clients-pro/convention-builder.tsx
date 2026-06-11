"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Formation = {
  id: string;
  titre: string;
  reference: string;
  certification: string | null;
  duree: string | null;
  modalite: string;
};
type Session = {
  id: string;
  formationId: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  horaires: string | null;
  label: string;
};

const FINANCEMENTS = [
  ["OPCO", "OPCO"],
  ["ENTREPRISE", "Plan de développement (entreprise)"],
  ["AUTOFINANCEMENT", "Autofinancement"],
  ["FRANCE_TRAVAIL", "France Travail"],
  ["CPF", "CPF"],
  ["AUTRE", "Autre"],
] as const;

export function ConventionBuilder({
  entrepriseId,
  formations,
  sessions,
}: {
  entrepriseId: string;
  formations: Formation[];
  sessions: Session[];
}) {
  const [formationId, setFormationId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [lieu, setLieu] = useState("");
  const [financement, setFinancement] = useState("OPCO");
  const [candidates, setCandidates] = useState<
    { prenom: string; nom: string; tarif: string }[]
  >([{ prenom: "", nom: "", tarif: "" }]);
  const [loading, setLoading] = useState(false);

  const formation = useMemo(
    () => formations.find((f) => f.id === formationId),
    [formationId, formations],
  );
  const sessionsForFormation = sessions.filter(
    (s) => !formationId || s.formationId === formationId,
  );

  function pickSession(id: string) {
    setSessionId(id);
    const s = sessions.find((x) => x.id === id);
    if (s) {
      setDateDebut(s.dateDebut);
      setDateFin(s.dateFin);
      setLieu(s.lieu ?? "");
      if (s.formationId) setFormationId(s.formationId);
    }
  }

  const setCand = (i: number, k: "prenom" | "nom" | "tarif", v: string) =>
    setCandidates((cs) => cs.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));

  async function generer() {
    const valides = candidates.filter((c) => c.prenom.trim() || c.nom.trim());
    if (!formation && !formationId) {
      toast.error("Choisissez une formation.");
      return;
    }
    if (valides.length === 0) {
      toast.error("Ajoutez au moins un candidat.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/convention", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entrepriseId,
          formation: formation?.titre,
          reference: formation?.reference,
          certification: formation?.certification,
          duree: formation?.duree,
          modalite: formation
            ? { PRESENTIEL: "Présentiel", DISTANCIEL: "Distanciel", MIXTE: "Mixte (présentiel + distanciel)" }[formation.modalite] ?? formation.modalite
            : "",
          dateDebut,
          dateFin,
          lieu,
          financement,
          candidates: valides,
        }),
      });
      if (!res.ok) {
        toast.error("Échec de la génération : " + (await res.text()));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Conventions.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Convention(s) générée(s) !");
    } catch {
      toast.error("Une erreur réseau est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Formation</Label>
          <select
            value={formationId}
            onChange={(e) => { setFormationId(e.target.value); setSessionId(""); }}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">— Choisir une formation —</option>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>{f.titre}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Session (optionnel — pré-remplit les dates)</Label>
          <select
            value={sessionId}
            onChange={(e) => pickSession(e.target.value)}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">— Saisie manuelle —</option>
            {sessionsForFormation.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Date de début</Label>
          <Input value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} placeholder="JJ/MM/AAAA" />
        </div>
        <div className="space-y-1.5">
          <Label>Date de fin</Label>
          <Input value={dateFin} onChange={(e) => setDateFin(e.target.value)} placeholder="JJ/MM/AAAA" />
        </div>
        <div className="space-y-1.5">
          <Label>Lieu</Label>
          <Input value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Nos locaux / sur site…" />
        </div>
        <div className="space-y-1.5">
          <Label>Mode de financement</Label>
          <select
            value={financement}
            onChange={(e) => setFinancement(e.target.value)}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {FINANCEMENTS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Candidats (un par convention) — tarif par candidat</p>
        <div className="space-y-2">
          {candidates.map((c, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-32 flex-1 space-y-1">
                <Label className="text-xs">Prénom</Label>
                <Input value={c.prenom} onChange={(e) => setCand(i, "prenom", e.target.value)} />
              </div>
              <div className="min-w-32 flex-1 space-y-1">
                <Label className="text-xs">Nom</Label>
                <Input value={c.nom} onChange={(e) => setCand(i, "nom", e.target.value)} />
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-xs">Tarif (€ net)</Label>
                <Input type="number" step="0.01" value={c.tarif} onChange={(e) => setCand(i, "tarif", e.target.value)} />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => setCandidates((cs) => cs.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => setCandidates((cs) => [...cs, { prenom: "", nom: "", tarif: "" }])}
        >
          <Plus className="mr-1 h-4 w-4" /> Ajouter un candidat
        </Button>
      </div>

      <Button onClick={generer} disabled={loading}>
        <FileDown className="mr-2 h-4 w-4" />
        {loading ? "Génération…" : "Générer la convention (PDF)"}
      </Button>
    </div>
  );
}
