import Link from "next/link";
import { ArrowLeft, CalendarClock, MailWarning, Clock3, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildSuivi6MoisRow, type Suivi6MoisRowInput } from "@/lib/suivi6mois-listing";
import { SUIVI_6MOIS_GRACE_DAYS, type Suivi6MoisStatut } from "@/lib/suivi6mois";
import { Suivi6MoisTable } from "@/components/qualiopi/suivi-6mois-table";

export const dynamic = "force-dynamic";

export default async function Suivi6MoisPage() {
  const db = await getTenantDb();
  const now = new Date();
  const inscriptions = await db.inscription.findMany({
    where: { statut: { not: "ANNULEE" } },
    include: { candidat: true, session: { include: { formation: true } } },
    orderBy: { session: { dateFin: "desc" } },
  });

  const rows = inscriptions.map((i) =>
    buildSuivi6MoisRow(
      {
        id: i.id,
        candidatPrenom: i.candidat.prenom,
        candidatNom: i.candidat.nom,
        candidatEmail: i.candidat.email,
        formationTitre: i.session.formation.titre,
        dateFin: i.session.dateFin,
        suivi6moisToken: i.suivi6moisToken,
        suivi6moisSentAt: i.suivi6moisSentAt,
        suivi6moisRelanceAt: i.suivi6moisRelanceAt,
        suivi6moisRelanceCount: i.suivi6moisRelanceCount,
        suivi6moisCompletedAt: i.suivi6moisCompletedAt,
        suivi6moisJson: i.suivi6moisJson,
      } satisfies Suivi6MoisRowInput,
      now,
    ),
  );

  const count = (s: Suivi6MoisStatut) => rows.filter((r) => r.statut === s).length;
  const aVenir = count("A_VENIR");
  const nonEnvoye = count("NON_ENVOYE");
  const enAttente = count("EN_ATTENTE");
  const fait = count("FAIT");
  const dus = nonEnvoye + enAttente + fait; // enquêtes dues (échéance atteinte)
  const tauxReponse = dus > 0 ? Math.round((fait / dus) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/qualiopi"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Conformité Qualiopi
        </Link>
        <PageHeader
          title="Suivi à 6 mois"
          subtitle={`Enquête de devenir des bénéficiaires (Qualiopi, indicateur 11). Envoi automatique 6 mois après la fin de formation (fenêtre de ${SUIVI_6MOIS_GRACE_DAYS} jours) ; au-delà, envoi manuel depuis cette page.`}
        >
          {rows.length > 0 && (
            <Button size="sm" variant="outline" render={<a href="/qualiopi/suivi-6mois/export" />}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Exporter (CSV)
            </Button>
          )}
        </PageHeader>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarClock} label="À venir" value={aVenir} tint="blue" />
        <StatCard
          icon={MailWarning}
          label="Non envoyé"
          value={nonEnvoye}
          tint={nonEnvoye > 0 ? "rose" : "emerald"}
        />
        <StatCard icon={Clock3} label="Envoyé, en attente" value={enAttente} tint="amber" />
        <StatCard icon={CheckCircle2} label={`Fait (${tauxReponse}%)`} value={fait} tint="emerald" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enquêtes de suivi</CardTitle>
        </CardHeader>
        <CardContent>
          <Suivi6MoisTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
