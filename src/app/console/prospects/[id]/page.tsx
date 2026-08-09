import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FlaskConical, Mail, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadTimeline } from "@/components/console/lead-timeline";
import { LeadTasks } from "@/components/console/lead-tasks";
import {
  LeadNoteForm,
  LeadNotesInternes,
  LeadStatutSelect,
} from "@/components/console/lead-note-form";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUT_LABELS: Record<string, string> = {
  NOUVEAU: "Nouveau",
  A_RAPPELER: "À rappeler",
  RAPPELE: "Rappelé",
  CONVERTI: "Converti",
  PERDU: "Perdu",
};
const STATUT_BADGE: Record<string, string> = {
  NOUVEAU: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  A_RAPPELER: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  RAPPELE: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  CONVERTI: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  PERDU: "bg-slate-500/10 text-slate-600",
};
const SOURCE_LABELS: Record<string, string> = {
  demo: "Démo",
  contact: "Contact",
  import: "Import CSV",
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Couleur du badge de score selon l'engagement du lead. */
function scoreClasse(score: number) {
  if (score >= 50) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (score >= 20) return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "bg-slate-500/10 text-slate-600 dark:text-slate-300";
}

export default async function FicheProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      events: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: [{ done: "asc" }, { createdAt: "desc" }] },
    },
  });
  if (!lead) notFound();

  // Marque le lead comme consulté directement en base (pas d'appel de server
  // action pendant le rendu d'un Server Component).
  if (!lead.lu) {
    await prisma.lead.update({ where: { id }, data: { lu: true } });
  }

  const source = lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : "Contact";
  const tachesOuvertes = lead.tasks.filter((t) => !t.done).length;

  return (
    <div className="space-y-6">
      <Link
        href="/console/prospects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux prospects
      </Link>

      <PageHeader
        title={lead.nom}
        subtitle={`${lead.organisme ? `${lead.organisme} · ` : ""}Créé le ${fmtDate(lead.createdAt)}`}
      >
        <Badge className={cn("text-[11px]", STATUT_BADGE[lead.statut])}>
          {STATUT_LABELS[lead.statut] ?? lead.statut}
        </Badge>
        <Badge className={cn("text-[11px]", scoreClasse(lead.score))}>Score {lead.score}</Badge>
        <Badge variant="outline" className="text-[11px]">
          {source}
        </Badge>
        <LeadStatutSelect leadId={lead.id} statut={lead.statut} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Colonne gauche : informations + notes + tâches */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-muted-foreground">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex items-center gap-1.5 hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {lead.email}
                </a>
                {lead.telephone && (
                  <a
                    href={`tel:${lead.telephone}`}
                    className="inline-flex items-center gap-1.5 hover:text-primary"
                  >
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {lead.telephone}
                  </a>
                )}
              </div>

              {(lead.hebergement || lead.formations.length > 0) && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {lead.hebergement && (
                    <p>
                      Hébergement : <span className="text-foreground">{lead.hebergement}</span>
                    </p>
                  )}
                  {lead.formations.length > 0 && (
                    <p>
                      Formations :{" "}
                      <span className="text-foreground">{lead.formations.join(", ")}</span>
                    </p>
                  )}
                </div>
              )}

              {lead.demoOrganismeId && (
                <Link
                  href={`/console/${lead.demoOrganismeId}`}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted"
                >
                  <FlaskConical className="h-3.5 w-3.5" /> Tenant démo
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}

              {lead.message && (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Message initial</p>
                  <p className="whitespace-pre-wrap">{lead.message}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-muted-foreground">Notes internes</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadNotesInternes leadId={lead.id} notes={lead.notes} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-muted-foreground">
                Tâches de relance
                {tachesOuvertes > 0 && ` (${tachesOuvertes} à faire)`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeadTasks leadId={lead.id} tasks={lead.tasks} />
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite : timeline d'activité */}
        <Card className="self-start">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-muted-foreground">
              Activité ({lead.events.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LeadNoteForm leadId={lead.id} />
            <LeadTimeline events={lead.events} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
