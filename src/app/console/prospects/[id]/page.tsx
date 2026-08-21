import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, ExternalLink, FlaskConical, Mail, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadTimeline } from "@/components/console/lead-timeline";
import { LeadTasks } from "@/components/console/lead-tasks";
import {
  LeadNoteForm,
  LeadNotesInternes,
  LeadStatutSelect,
} from "@/components/console/lead-note-form";
import { ConvertLeadButton } from "@/components/console/convert-lead-button";
import { LeadQualificationForm } from "@/components/console/lead-qualification-form";
import { statutLabel, statutTone } from "@/components/console/lead-statut";
import { temperature, type QualifInput } from "@/lib/growth/qualification";
import { TONE_CLASSES } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TEMP_META: Record<string, { label: string; cls: string }> = {
  chaud: { label: "Chaud", cls: TONE_CLASSES.success },
  tiede: { label: "Tiède", cls: TONE_CLASSES.warning },
  froid: { label: "Froid", cls: TONE_CLASSES.neutral },
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
  if (score >= 50) return TONE_CLASSES.success;
  if (score >= 20) return TONE_CLASSES.warning;
  return TONE_CLASSES.neutral;
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

  const qualif: QualifInput = {
    verticale: lead.verticale as QualifInput["verticale"],
    outilActuel: lead.outilActuel as QualifInput["outilActuel"],
    echeanceQualiopi: lead.echeanceQualiopi as QualifInput["echeanceQualiopi"],
    volumeStagiairesMois: lead.volumeStagiairesMois,
    malARemplir: lead.malARemplir,
  };
  const temp = TEMP_META[temperature(qualif)];

  // Client déjà créé depuis ce prospect ? (organismeId dans la meta de l'événement).
  const convEvent = lead.events.find((e) => e.type === "conversion");
  const convertedOrgId =
    convEvent && convEvent.meta && typeof convEvent.meta === "object" && !Array.isArray(convEvent.meta)
      ? ((convEvent.meta as Record<string, unknown>).organismeId as string | undefined)
      : undefined;

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
        <Badge className={cn("text-[11px]", statutTone(lead.statut))}>
          {statutLabel(lead.statut)}
        </Badge>
        <Badge className={cn("text-[11px]", temp.cls)}>{temp.label}</Badge>
        <Badge className={cn("text-[11px]", scoreClasse(lead.score))}>Score {lead.score}</Badge>
        <Badge variant="outline" className="text-[11px]">
          {source}
        </Badge>
        <LeadStatutSelect leadId={lead.id} statut={lead.statut} />
        {convertedOrgId ? (
          <Button size="sm" variant="outline" render={<Link href={`/console/${convertedOrgId}`} />}>
            <Building2 className="mr-1.5 h-4 w-4" /> Voir le client
          </Button>
        ) : (
          <ConvertLeadButton leadId={lead.id} hasDemo={!!lead.demoOrganismeId} />
        )}
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
              <CardTitle className="text-sm text-muted-foreground">Qualification</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadQualificationForm
                leadId={lead.id}
                verticale={lead.verticale}
                outilActuel={lead.outilActuel}
                echeanceQualiopi={lead.echeanceQualiopi}
                volumeStagiairesMois={lead.volumeStagiairesMois}
                malARemplir={lead.malARemplir}
                decideur={lead.decideur}
              />
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
