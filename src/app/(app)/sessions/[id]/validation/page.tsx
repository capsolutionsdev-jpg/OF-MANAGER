import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { getSessionValidation } from "@/lib/validation/service";
import { SessionTabs } from "@/components/sessions/session-tabs";
import { ValidationBoard } from "@/components/sessions/validation-board";
import { Badge } from "@/components/ui/badge";
import { SESSION_STATUT_LABELS } from "@/lib/validators/session";

export const dynamic = "force-dynamic";

export default async function SessionValidationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getTenantDb();
  const s = await db.session.findUnique({
    where: { id },
    select: { id: true, statut: true, formation: { select: { titre: true } } },
  });
  if (!s) notFound();

  const state = await getSessionValidation(id);
  if (!state) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sessions"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux sessions
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{s.formation.titre}</h1>
          <Badge variant="outline">{SESSION_STATUT_LABELS[s.statut]}</Badge>
          {state.isValidated && !state.isArchived && (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Prête à archiver</Badge>
          )}
          {state.isArchived && (
            <Badge className="bg-muted text-muted-foreground">Archivée</Badge>
          )}
        </div>
      </div>

      <SessionTabs
        sessionId={id}
        active="validation"
        validationBadge={{ percentage: state.percentage, ok: state.isValidated }}
      />

      <ValidationBoard state={state} />
    </div>
  );
}
