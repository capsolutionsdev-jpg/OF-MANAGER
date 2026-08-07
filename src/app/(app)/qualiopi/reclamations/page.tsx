import Link from "next/link";
import { ArrowLeft, Loader2, Clock3, MailWarning, CheckCircle2 } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewReclamationDialog } from "@/components/qualiopi/new-reclamation-dialog";
import {
  ReclamationsTable,
  type ReclamationRow,
} from "@/components/qualiopi/reclamations-table";

export const dynamic = "force-dynamic";

function joursOuvresDepuis(d: Date): number {
  let n = 0;
  const cur = new Date(d);
  const now = new Date();
  while (cur < now) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

export default async function ReclamationsPage() {
  const db = await getTenantDb();
  const reclamations = await db.reclamation.findMany({
    orderBy: { date: "desc" },
  });

  const rows: ReclamationRow[] = reclamations.map((r) => ({
    id: r.id,
    statut: r.statut,
    origine: r.origine,
    declarant: r.declarant,
    contact: r.contact,
    formation: r.formation,
    objet: r.objet,
    description: r.description,
    gravite: r.gravite,
    date: r.date.toISOString(),
    arDate: r.arDate ? r.arDate.toISOString() : null,
    reponseDate: r.reponseDate ? r.reponseDate.toISOString() : null,
    clotureDate: r.clotureDate ? r.clotureDate.toISOString() : null,
    retardAr: r.statut === "NOUVELLE" && joursOuvresDepuis(r.date) > 5,
    retardReponse: r.statut !== "CLOTUREE" && joursOuvresDepuis(r.date) > 15,
  }));

  const enCours = rows.filter((r) => r.statut !== "CLOTUREE").length;
  const retardAr = rows.filter((r) => r.retardAr).length;
  const retardReponse = rows.filter((r) => r.retardReponse).length;
  const cloturees = rows.filter((r) => r.statut === "CLOTUREE").length;

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
          title="Registre des réclamations"
          subtitle="Traitement des aléas, difficultés et réclamations (indicateurs 31-32). Objectifs : accusé de réception sous 5 jours ouvrés, réponse sous 15 jours ouvrés."
        >
          <NewReclamationDialog />
        </PageHeader>
      </div>

      {/* Bande KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Loader2} label="En cours" value={enCours} tint="blue" />
        <StatCard
          icon={MailWarning}
          label="Retard accusé de réception"
          value={retardAr}
          tint={retardAr > 0 ? "rose" : "emerald"}
        />
        <StatCard
          icon={Clock3}
          label="Retard réponse"
          value={retardReponse}
          tint={retardReponse > 0 ? "rose" : "emerald"}
        />
        <StatCard icon={CheckCircle2} label="Clôturées" value={cloturees} tint="emerald" />
      </div>

      {/* Registre */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registre</CardTitle>
        </CardHeader>
        <CardContent>
          <ReclamationsTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
