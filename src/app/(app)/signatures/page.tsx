import Link from "next/link";
import { CheckCircle2, Clock, FileSignature } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { emailConfigured } from "@/lib/email";
import { RelanceButton } from "@/components/signatures/relance-button";
import { SignedOnSiteButton } from "@/components/signatures/signed-on-site-button";

export const dynamic = "force-dynamic";

export default async function SignaturesPage() {
  const db = await getTenantDb();
  // Toutes les inscriptions engagées dans un parcours de signature
  const inscriptions = await db.inscription.findMany({
    where: { statut: { not: "ANNULEE" } },
    include: {
      candidat: { select: { prenom: true, nom: true, email: true } },
      session: { include: { formation: { select: { titre: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const demo = !emailConfigured();
  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

  const signes = inscriptions.filter((i) => i.signedAt);
  const enAttente = inscriptions.filter((i) => !i.signedAt);

  const Etape = ({ ok, label }: { ok: boolean; label: string }) => (
    <Badge
      className={
        ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
      }
    >
      {ok ? "✓ " : "○ "}
      {label}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Signatures électroniques
        </h1>
        <p className="text-sm text-muted-foreground">
          Suivi des signatures du parcours candidat (formulaire + documents).
          {demo && " Mode démo — renseignez BREVO_API_KEY pour l'envoi réel des relances."}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileSignature className="h-7 w-7 text-primary" />
            <div>
              <p className="text-xl font-bold">{inscriptions.length}</p>
              <p className="text-xs text-muted-foreground">Dossiers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            <div>
              <p className="text-xl font-bold">{signes.length}</p>
              <p className="text-xs text-muted-foreground">Signés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-7 w-7 text-amber-600" />
            <div>
              <p className="text-xl font-bold">{enAttente.length}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* En attente de signature */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" /> En attente ({enAttente.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {enAttente.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Aucune signature en attente. 🎉
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Formation</TableHead>
                  <TableHead>Avancement</TableHead>
                  <TableHead className="text-right">Relance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enAttente.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/candidats/${i.candidatId}`}
                        className="hover:underline"
                      >
                        {i.candidat.prenom} {i.candidat.nom}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {i.candidat.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {i.session.formation.titre}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Etape ok={!!i.accessToken} label="Lien envoyé" />
                        <Etape ok={!!i.formCompletedAt} label="Formulaire" />
                        <Etape ok={!!i.signedAt} label="Signé" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <RelanceButton inscriptionId={i.id} />
                        <SignedOnSiteButton inscriptionId={i.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Signés */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4" /> Signés ({signes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {signes.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Aucun document signé pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Formation</TableHead>
                  <TableHead>Signé le</TableHead>
                  <TableHead>Copie envoyée</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signes.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/candidats/${i.candidatId}`}
                        className="hover:underline"
                      >
                        {i.candidat.prenom} {i.candidat.nom}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {i.session.formation.titre}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmt(i.signedAt)}
                    </TableCell>
                    <TableCell>
                      {i.docsCopieSentAt ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          ✓ {fmt(i.docsCopieSentAt)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
