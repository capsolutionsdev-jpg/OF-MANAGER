"use client";

import { useState } from "react";
import { MapPin, Send, ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CandidatForm } from "@/components/candidats/candidat-form";
import { InvitationDistanceForm } from "@/components/candidats/invitation-distance-form";
import type { SessionOption } from "@/components/inscriptions/quick-enroll-modal";

type FormationOption = { id: string; titre: string; reference?: string | null };
type Mode = "surplace" | "distance";

/**
 * Point d'entrée « Commencer une inscription » : on choisit d'abord le mode.
 * - Sur place : dossier complet (le candidat est présent), puis confirmation +
 *   signature possibles depuis la fiche.
 * - À distance : nom/prénom/e-mail → le candidat reçoit un lien pour compléter +
 *   signer sa fiche en ligne (il arrive dans les prospects).
 */
export function NouvelleInscription({
  formations,
  collaborateurs,
  sessions,
}: {
  formations: FormationOption[];
  collaborateurs: { id: string; name: string }[];
  sessions: SessionOption[];
}) {
  const [mode, setMode] = useState<Mode | null>(null);

  if (mode === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <ModeCard
          icon={MapPin}
          title="Sur place"
          desc="Le candidat est présent : vous remplissez son dossier, puis vous pouvez confirmer et faire signer l'inscription."
          onClick={() => setMode("surplace")}
        />
        <ModeCard
          icon={Send}
          title="À distance"
          desc="Vous saisissez juste nom, prénom et e-mail. Le candidat reçoit un lien pour compléter son dossier et signer — il arrive dans vos prospects."
          onClick={() => setMode("distance")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setMode(null)}
        className="text-muted-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Changer de mode
      </Button>
      {mode === "surplace" ? (
        <CandidatForm
          formations={formations}
          collaborateurs={collaborateurs}
          sessions={sessions}
        />
      ) : (
        <InvitationDistanceForm formations={formations} />
      )}
    </div>
  );
}

function ModeCard({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-6 w-6 text-primary" />
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{desc}</span>
    </button>
  );
}
