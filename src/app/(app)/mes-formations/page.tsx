import Link from "next/link";
import { BookOpen, CalendarClock, MapPin, User, PenLine, FileText, ExternalLink } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { getCurrentApprenant, sessionPhase } from "@/lib/candidat-portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
const PHASE = {
  AVENIR: { label: "À venir", cls: "bg-muted text-muted-foreground" },
  EN_COURS: { label: "En cours", cls: "bg-info/10 text-info" },
  TERMINEE: { label: "Terminée", cls: "bg-success/10 text-success" },
} as const;

export default async function MesFormationsPage() {
  const apprenant = await getCurrentApprenant();
  if (!apprenant) {
    return (
      <div className="space-y-4">
        <PageHeader title="Mes formations" />
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          Aucun dossier candidat associé à ce compte.
        </CardContent></Card>
      </div>
    );
  }

  const db = await getTenantDb();
  const inscriptions = await db.inscription.findMany({
    where: { candidatId: apprenant.candidatId, statut: { not: "ANNULEE" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, accessToken: true, signedAt: true, resultatCertification: true,
      session: {
        select: {
          dateDebut: true, dateFin: true, lieu: true, horaires: true, modalite: true,
          formation: { select: { titre: true, reference: true } },
          formateurs: { select: { nom: true, prenom: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Mes formations" subtitle="Toutes les formations auxquelles vous êtes inscrit(e)." icon={BookOpen} />

      {inscriptions.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title="Aucune formation pour le moment"
            description="Vos inscriptions apparaîtront ici. Consultez le catalogue pour découvrir nos formations."
            actionLabel="Voir le catalogue" actionHref="/catalogue" />
        </Card>
      ) : (
        inscriptions.map((i) => {
          const phase = sessionPhase(i.session.dateDebut, i.session.dateFin);
          const p = PHASE[phase];
          const form = i.session.formateurs[0];
          return (
            <Card key={i.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">{i.session.formation.titre}</CardTitle>
                  <p className="text-xs text-muted-foreground">{i.session.formation.reference}</p>
                </div>
                <Badge className={p.cls}>{p.label}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="h-4 w-4" /> Du {fmt(i.session.dateDebut)} au {fmt(i.session.dateFin)}
                    {i.session.horaires ? ` · ${i.session.horaires}` : ""}
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {i.session.lieu || "Lieu communiqué par l'organisme"}
                  </span>
                  {form && (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" /> Formateur : {form.prenom} {form.nom}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {i.resultatCertification === "CERTIFIE" ? "✅ Certifié(e)" :
                      i.signedAt ? "Inscription signée" : "Inscription en cours de finalisation"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Link href="/mes-documents" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <FileText className="h-4 w-4" /> Documents
                  </Link>
                  {!i.signedAt && i.accessToken && (
                    <Link href={`/parcours/${i.accessToken}`} className="inline-flex items-center gap-1 font-medium text-warning hover:underline">
                      <PenLine className="h-4 w-4" /> Finaliser / signer
                    </Link>
                  )}
                  {i.accessToken && (
                    <Link href={`/parcours/${i.accessToken}`} className="inline-flex items-center gap-1 text-muted-foreground hover:underline">
                      <ExternalLink className="h-4 w-4" /> Mon parcours
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
