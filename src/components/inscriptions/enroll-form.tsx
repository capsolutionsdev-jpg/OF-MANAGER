"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserPlus, ClipboardCheck } from "lucide-react";

import {
  inscriptionFormSchema,
  type InscriptionFormValues,
  INSCRIPTION_STATUT_LABELS,
} from "@/lib/validators/inscription";
import { FINANCEMENT_LABELS, CNAPS_STATUT_LABELS } from "@/lib/validators/candidat";
import { createInscription } from "@/lib/actions/inscription-actions";
import { setCandidatPrerequis } from "@/lib/actions/candidat-actions";
import { type PrereqSpec, hasPrereq } from "@/lib/inscription/prerequis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

type CandidatOption = { id: string; nom: string; prenom: string };

export function EnrollForm({
  sessionId,
  candidats,
  prereq = {},
  piecesAttendues = [],
}: {
  sessionId: string;
  candidats: CandidatOption[];
  /** Prérequis/spécificités déduits de la formation (SSIAP, CNAPS, carte pro…). */
  prereq?: PrereqSpec;
  /** Pièces du dossier administratif attendues pour la formation. */
  piecesAttendues?: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Champs de spécificités (portés par le candidat).
  const [ssiapNum, setSsiapNum] = useState("");
  const [ssiapDate, setSsiapDate] = useState("");
  const [cnaps, setCnaps] = useState("");
  const [carteProNum, setCarteProNum] = useState("");
  const [carteProVal, setCarteProVal] = useState("");
  const [sstCert, setSstCert] = useState(false);
  // Suivi de l'inscription.
  const [positionnement, setPositionnement] = useState<"lien" | "sur_place">("lien");
  const [prerequisOk, setPrerequisOk] = useState(false);

  const { register, handleSubmit, reset } = useForm<InscriptionFormValues>({
    resolver: zodResolver(inscriptionFormSchema),
    defaultValues: { candidatId: "", sessionId, financementType: "", statut: "EN_ATTENTE", montant: "" },
  });

  const showSection = hasPrereq(prereq) || piecesAttendues.length > 0;

  function onSubmit(values: InscriptionFormValues) {
    startTransition(async () => {
      const res = await createInscription(values, {
        positionnementSurPlace: positionnement === "sur_place",
        prerequisVerifies: prerequisOk,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Reporte les spécificités sur la fiche candidat (réutilisables).
      if (values.candidatId) {
        const input: Record<string, string> = {};
        if (prereq.ssiap) {
          input.ssiapNumero = ssiapNum;
          input.ssiapDate = ssiapDate;
          input.ssiapNiveau = String(prereq.ssiap.niveau);
        }
        if (prereq.cnaps && cnaps) input.cnapsStatut = cnaps;
        if (prereq.carteProAlternative) {
          input.carteProNumero = carteProNum;
          input.carteProValidite = carteProVal;
        }
        if (Object.keys(input).length > 0) await setCandidatPrerequis(values.candidatId, input);
      }
      toast.success("Candidat inscrit à la session.");
      reset({ candidatId: "", sessionId, financementType: "", statut: "EN_ATTENTE", montant: "" });
      setSsiapNum(""); setSsiapDate(""); setCnaps(""); setCarteProNum(""); setCarteProVal("");
      setSstCert(false); setPrerequisOk(false); setPositionnement("lien");
      router.refresh();
    });
  }

  if (candidats.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tous les candidats sont déjà inscrits à cette session (ou aucun candidat n&apos;existe encore).
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("sessionId")} />

      {/* Ligne principale */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="candidatId">Candidat</Label>
          <select id="candidatId" className={selectClass} {...register("candidatId")}>
            <option value="">— Choisir un candidat —</option>
            {candidats.map((c) => (
              <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="financementType">Financement</Label>
          <select id="financementType" className={selectClass} {...register("financementType")}>
            <option value="">Non précisé</option>
            {Object.entries(FINANCEMENT_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="statut">Statut</Label>
          <select id="statut" className={selectClass} {...register("statut")}>
            {Object.entries(INSCRIPTION_STATUT_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="montant">Montant (€)</Label>
          <Input id="montant" type="number" step="0.01" {...register("montant")} />
        </div>
      </div>

      {/* Prérequis & spécificités de la formation */}
      {showSection && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Prérequis &amp; spécificités de la formation
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {prereq.ssiap && (
              <>
                <div className="grid gap-2 lg:col-span-2">
                  <Label htmlFor="ssiapNum">N° du diplôme SSIAP {prereq.ssiap.niveau} détenu</Label>
                  <Input id="ssiapNum" value={ssiapNum} onChange={(e) => setSsiapNum(e.target.value)} placeholder="091-9119-1-2018-00246" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ssiapDate">Obtenu le</Label>
                  <Input id="ssiapDate" type="date" value={ssiapDate} onChange={(e) => setSsiapDate(e.target.value)} />
                </div>
              </>
            )}
            {prereq.cnaps && (
              <div className="grid gap-2 lg:col-span-2">
                <Label htmlFor="cnaps">Autorisation préalable CNAPS</Label>
                <select id="cnaps" className={selectClass} value={cnaps} onChange={(e) => setCnaps(e.target.value)}>
                  <option value="">— À renseigner —</option>
                  {Object.entries(CNAPS_STATUT_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                </select>
              </div>
            )}
            {prereq.carteProAlternative && (
              <>
                <div className="grid gap-2 lg:col-span-2">
                  <Label htmlFor="carteProNum">…ou carte professionnelle — n°</Label>
                  <Input id="carteProNum" value={carteProNum} onChange={(e) => setCarteProNum(e.target.value)} placeholder="CAR-…" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="carteProVal">Valable jusqu&apos;au</Label>
                  <Input id="carteProVal" type="date" value={carteProVal} onChange={(e) => setCarteProVal(e.target.value)} />
                </div>
              </>
            )}
            {prereq.sstCert && (
              <label className="flex items-center gap-2 text-sm lg:col-span-2">
                <input type="checkbox" className="h-4 w-4" checked={sstCert} onChange={(e) => setSstCert(e.target.checked)} />
                Titulaire du certificat SST (en cours de validité ou récemment expiré)
              </label>
            )}
          </div>

          {piecesAttendues.length > 0 && (
            <div className="mt-3 text-sm">
              <p className="mb-1 font-medium text-muted-foreground">Dossier administratif — pièces à réunir :</p>
              <ul className="flex flex-wrap gap-1.5">
                {piecesAttendues.map((p, i) => (
                  <li key={i} className="rounded-full border bg-background px-2.5 py-0.5 text-xs">{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Positionnement + attestation Qualiopi */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:items-end">
        <div className="grid gap-2">
          <Label htmlFor="positionnement">Positionnement (analyse du besoin)</Label>
          <select id="positionnement" className={selectClass} value={positionnement} onChange={(e) => setPositionnement(e.target.value as "lien" | "sur_place")}>
            <option value="lien">Envoyer le lien au candidat (à distance)</option>
            <option value="sur_place">Réalisé sur place (présentiel)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={prerequisOk} onChange={(e) => setPrerequisOk(e.target.checked)} />
          J&apos;atteste avoir vérifié les prérequis d&apos;accès à la formation
        </label>
      </div>

      <Button type="submit" disabled={isPending}>
        <UserPlus className="mr-2 h-4 w-4" />
        {isPending ? "Inscription…" : "Inscrire le candidat"}
      </Button>
    </form>
  );
}
