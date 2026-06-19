import { Shield, FileDown, Trash2, Clock, Accessibility } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
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
import {
  createDataRequest,
  processDataRequest,
} from "@/lib/actions/rgpd-actions";

const TYPE_LABELS: Record<string, string> = {
  EXPORT: "Export des données",
  SUPPRESSION: "Suppression / anonymisation",
};
const STATUT_LABELS: Record<string, string> = {
  RECUE: "Reçue",
  EN_COURS: "En cours",
  TRAITEE: "Traitée",
  REFUSEE: "Refusée",
};
const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">RGPD</h1>
        <p className="text-sm text-muted-foreground">
          Consentements, demandes d&apos;accès et de suppression, registre des
          traitements.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" /> Durée de conservation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{org?.dureeConservationMois ?? 36} mois</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Au-delà, sans activité, les données candidats sont anonymisées
              automatiquement (purge quotidienne). Modifiable par l&apos;éditeur.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Accessibility className="h-4 w-4" /> Référent handicap (Qualiopi 26)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {org?.referentHandicapNom ? (
              <>
                <p className="font-semibold">{org.referentHandicapNom}</p>
                {org.referentHandicapContact && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{org.referentHandicapContact}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Non renseigné — à définir avec l&apos;éditeur pour la conformité accessibilité.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Consentements recueillis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{nbConsent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Demandes RGPD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Demandes d'exercice des droits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demandes d&apos;exercice des droits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={createDataRequest}
            className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3 sm:items-end"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="subjectEmail">Email du demandeur</Label>
              <Input
                id="subjectEmail"
                name="subjectEmail"
                type="email"
                placeholder="personne@example.com"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="type">Type de demande</Label>
              <select id="type" name="type" className={selectClass}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Enregistrer la demande</Button>
          </form>

          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune demande enregistrée.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Reçue le</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.subjectEmail}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {TYPE_LABELS[r.type]}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.statut === "TRAITEE" ? "default" : "secondary"}
                      >
                        {STATUT_LABELS[r.statut]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.requestedAt.toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.statut !== "TRAITEE" ? (
                        <form action={processDataRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <Button type="submit" size="sm" variant="outline">
                            Marquer traitée
                          </Button>
                        </form>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Consentements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" /> Derniers consentements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
