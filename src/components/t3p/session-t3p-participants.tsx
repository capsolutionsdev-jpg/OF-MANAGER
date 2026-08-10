"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, Info, Plus } from "lucide-react";

import {
  T3P_METIER_LABELS,
  T3P_STATUT_LABELS,
  alertePrincipale,
  etapeCourante,
  parcoursEtapes,
  progression,
  type T3PMetier,
} from "@/lib/t3p";
import { creerParcoursT3P } from "@/lib/actions/t3p-actions";
import { ParcoursT3PPanel, type ParcoursDto } from "@/components/t3p/parcours-t3p-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type SessionT3PParticipant = {
  candidatId: string;
  nom: string;
  prenom: string;
  statutInscription: string;
  parcours: ParcoursDto | null;
};

/**
 * Onglet « Parcours T3P » d'une session Taxi/VTC : un accordéon par
 * participant. L'en-tête résume l'étape courante et l'alerte la plus grave ;
 * le corps déplie le suivi complet éditable (ParcoursT3PPanel). Un participant
 * sans parcours dispose d'un bouton d'ouverture (métier fixé par la session).
 */
export function SessionT3PParticipants({
  participants,
  metier,
}: {
  participants: SessionT3PParticipant[];
  metier: T3PMetier;
}) {
  const [ouvert, setOuvert] = useState<string | null>(
    // Ouvre d'office le premier participant qui a une alerte, sinon le premier.
    participants.find((p) => p.parcours && alertePrincipale(parcoursEtapes(p.parcours)))?.candidatId ??
      participants[0]?.candidatId ??
      null,
  );

  if (participants.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Aucun participant inscrit à cette session pour l&apos;instant. Inscrivez des
          candidats depuis l&apos;onglet « Participants » : leur parcours {T3P_METIER_LABELS[metier]}{" "}
          s&apos;ouvrira automatiquement.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {participants.map((p) => (
        <ParticipantAccordion
          key={p.candidatId}
          participant={p}
          metier={metier}
          isOpen={ouvert === p.candidatId}
          onToggle={() => setOuvert(ouvert === p.candidatId ? null : p.candidatId)}
        />
      ))}
    </div>
  );
}

function ParticipantAccordion({
  participant,
  metier,
  isOpen,
  onToggle,
}: {
  participant: SessionT3PParticipant;
  metier: T3PMetier;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const p = participant.parcours;

  const etapes = p ? parcoursEtapes(p) : [];
  const courante = p ? etapeCourante(etapes) : null;
  const alerte = p ? alertePrincipale(etapes) : null;
  const prog = p ? progression(etapes) : { faites: 0, total: 11 };

  function ouvrirParcours() {
    startTransition(async () => {
      const res = await creerParcoursT3P(participant.candidatId, metier);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Parcours ouvert.");
      router.refresh();
    });
  }

  const statutBadge =
    p?.statut === "REUSSI"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : p?.statut === "ABANDONNE"
        ? "bg-red-500/10 text-red-700 dark:text-red-300"
        : "bg-sky-500/10 text-sky-700 dark:text-sky-300";

  return (
    <Card>
      <button
        type="button"
        onClick={p ? onToggle : undefined}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left ${p ? "cursor-pointer hover:bg-muted/40" : "cursor-default"}`}
      >
        {p && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        )}
        <span className="font-medium">
          {participant.prenom} {participant.nom}
        </span>
        {p ? (
          <>
            <Badge className={statutBadge}>{T3P_STATUT_LABELS[p.statut]}</Badge>
            <span className="text-xs text-muted-foreground">
              {prog.faites}/{prog.total} · {courante?.num}. {courante?.label}
            </span>
            {alerte && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs">
                {alerte.niveau === "info" ? (
                  <Info className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                ) : (
                  <AlertTriangle
                    className={`h-3.5 w-3.5 ${alerte.niveau === "danger" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
                  />
                )}
                <span
                  className={
                    alerte.niveau === "danger"
                      ? "text-red-700 dark:text-red-300"
                      : alerte.niveau === "warn"
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-sky-700 dark:text-sky-300"
                  }
                >
                  {alerte.message}
                </span>
              </span>
            )}
          </>
        ) : (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Parcours non ouvert</span>
            <Button size="sm" variant="outline" disabled={isPending} onClick={ouvrirParcours}>
              <Plus className="mr-1 h-4 w-4" /> Ouvrir le parcours {T3P_METIER_LABELS[metier]}
            </Button>
          </div>
        )}
      </button>

      {p && isOpen && (
        <CardContent className="border-t pt-4">
          <ParcoursT3PPanel parcours={p} />
        </CardContent>
      )}
    </Card>
  );
}
