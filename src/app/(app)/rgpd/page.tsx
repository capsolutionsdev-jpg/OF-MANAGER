import {
  Shield,
  FileDown,
  Trash2,
  Clock,
  Accessibility,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { NewDataRequestDialog } from "@/components/rgpd/new-data-request-dialog";
import {
  DataRequestsTable,
  type DataRequestRow,
} from "@/components/rgpd/data-requests-table";

export default async function RgpdPage() {
  const { organismeId, db } = await requireTenant();
  const [org, requests, consentements, nbConsent] = await Promise.all([
    prisma.organisme.findUnique({
      where: { id: organismeId },
      select: { dureeConservationMois: true, referentHandicapNom: true, referentHandicapContact: true },
    }),
    db.dataRequest.findMany({ orderBy: { requestedAt: "desc" } }),
    db.consentement.findMany({
      orderBy: { accepteLe: "desc" },
      take: 15,
      include: { candidat: true },
    }),
    db.consentement.count(),
  ]);

  const requestRows: DataRequestRow[] = requests.map((r) => ({
    id: r.id,
    subjectEmail: r.subjectEmail,
    type: r.type,
    statut: r.statut,
    requestedAt: r.requestedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="RGPD"
        subtitle="Consentements, demandes d'accès et de suppression, registre des traitements."
      />

      {/* Bande KPI unique (4 tuiles) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Durée de conservation"
          value={`${org?.dureeConservationMois ?? 36} mois`}
          tint="blue"
          trend="Anonymisation auto au-delà (purge quotidienne)"
        />
        <StatCard
          icon={Accessibility}
          label="Référent handicap (Qualiopi 26)"
          value={org?.referentHandicapNom ?? "À définir"}
          tint="violet"
          trend={org?.referentHandicapContact ?? (org?.referentHandicapNom ? undefined : "À définir avec l'éditeur")}
        />
        <StatCard
          icon={Shield}
          label="Consentements recueillis"
          value={nbConsent}
          tint="emerald"
        />
        <StatCard
          icon={ClipboardList}
          label="Demandes d'exercice des droits"
          value={requests.length}
          tint="amber"
        />
      </div>

      {/* Demandes d'exercice des droits : table d'abord + dialog + filtre */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demandes d&apos;exercice des droits</CardTitle>
          <CardAction>
            <NewDataRequestDialog />
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataRequestsTable rows={requestRows} />
        </CardContent>
      </Card>

      {/* Consentements : repliable (« Voir tout ») */}
      <Card>
        <CardContent className="p-0">
          <details className="group [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-base font-medium">
              <Shield className="h-4 w-4" /> Derniers consentements
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums text-muted-foreground">
                {nbConsent}
              </span>
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t">
              {consentements.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  Aucun consentement enregistré.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Personne</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Accepté le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consentements.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.candidat
                            ? `${c.candidat.prenom} ${c.candidat.nom}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{c.type}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.accepteLe.toLocaleDateString("fr-FR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </details>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileDown className="h-3.5 w-3.5" /> Export des données : depuis une fiche
        candidat (bouton « Exporter RGPD »).
        <Trash2 className="ml-2 h-3.5 w-3.5" /> Anonymisation : depuis la fiche
        candidat (bouton « Anonymiser »).
      </p>
    </div>
  );
}
