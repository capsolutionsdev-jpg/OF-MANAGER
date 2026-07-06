"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Archive, BellRing, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifierCollaborateurs } from "@/lib/actions/session-guard-actions";
import { archiveSessionValidated } from "@/lib/actions/session-validation-actions";

export function SessionClotureBar({
  sessionId,
  canArchive,
  dejaArchivee,
}: {
  sessionId: string;
  canArchive: boolean;
  dejaArchivee: boolean;
}) {
  const router = useRouter();
  const [archiving, startArchive] = useTransition();
  const [notifying, startNotify] = useTransition();

  function archiver() {
    startArchive(async () => {
      // L'archivage s'appuie exclusivement sur le service de validation.
      const r = await archiveSessionValidated(sessionId);
      if (r.ok) { toast.success("Session archivée (clôturée)."); router.refresh(); }
      else toast.error(r.error);
    });
  }
  function notifier() {
    startNotify(async () => {
      const r = await notifierCollaborateurs(sessionId);
      if (r.ok) toast.success("Rappel envoyé aux collaborateurs.");
      else toast.error(r.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" render={<Link href={`/sessions/${sessionId}/validation`} />}>
        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Validation
      </Button>
      <Button size="sm" variant="outline" onClick={notifier} disabled={notifying}>
        {notifying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <BellRing className="mr-1.5 h-3.5 w-3.5" />}
        Rappeler les collaborateurs
      </Button>
      {dejaArchivee ? (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          <Archive className="h-3.5 w-3.5" /> Session archivée
        </span>
      ) : (
        <Button
          size="sm"
          onClick={archiver}
          disabled={archiving || !canArchive}
          title={canArchive ? "Clôturer et archiver la session" : "Impossible : validation incomplète (voir l'onglet Validation)"}
        >
          {archiving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : canArchive ? (
            <Archive className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Lock className="mr-1.5 h-3.5 w-3.5" />
          )}
          Archiver la session
        </Button>
      )}
    </div>
  );
}
