import Link from "next/link";
import { ArrowLeft, Pencil, ClipboardCheck, FileText } from "lucide-react";
import type { SessionStatut } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SESSION_STATUT_LABELS } from "@/lib/validators/session";
import { SendConvocationsButton } from "@/components/sessions/send-convocations-button";
import { SessionTabs, type SessionTabKey } from "@/components/sessions/session-tabs";

/**
 * En-tête partagé des onglets de la page Session.
 * Rend le lien retour, le titre + badge statut, les actions transverses
 * (convocations, émargement, contrat formateur, modifier) puis la barre
 * d'onglets. Chaque page d'onglet le rend UNE fois (pas de layout.tsx, sinon
 * double en-tête avec les sous-pages validation/emargement/modifier).
 */
export function SessionDetailHeader({
  session,
  active,
  validationBadge,
  showT3P = false,
}: {
  session: {
    id: string;
    titre: string;
    statut: SessionStatut;
    nbFormateurs: number;
  };
  active: SessionTabKey;
  validationBadge?: { percentage: number; ok: boolean };
  /** Affiche l'onglet « Parcours T3P » (session Taxi/VTC) — cf. getSessionDetail. */
  showT3P?: boolean;
}) {
  return (
    <div>
      <Link
        href="/sessions"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux sessions
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{session.titre}</h1>
          <Badge variant="outline">{SESSION_STATUT_LABELS[session.statut]}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <SendConvocationsButton sessionId={session.id} />
          <Button
            variant="outline"
            render={<Link href={`/sessions/${session.id}/emargement`} />}
          >
            <ClipboardCheck className="mr-2 h-4 w-4" /> Émargement
          </Button>
          {session.nbFormateurs > 0 && (
            <Button
              variant="outline"
              render={<a href={`/documents/contrat-formateur/${session.id}`} download />}
            >
              <FileText className="mr-2 h-4 w-4" /> Contrat formateur
            </Button>
          )}
          <Button
            variant="outline"
            render={<Link href={`/sessions/${session.id}/modifier`} />}
          >
            <Pencil className="mr-2 h-4 w-4" /> Modifier
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <SessionTabs
          sessionId={session.id}
          active={active}
          validationBadge={validationBadge}
          showT3P={showT3P}
        />
      </div>
    </div>
  );
}
