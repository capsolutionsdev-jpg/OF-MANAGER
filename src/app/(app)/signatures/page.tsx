import { PenLine } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { yousignConfigured } from "@/lib/yousign";
import { markSignatureSigned } from "@/lib/actions/signature-actions";

const STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  ENVOYEE: "Envoyée",
  SIGNEE: "Signée",
  REFUSEE: "Refusée",
  EXPIREE: "Expirée",
};

export default async function SignaturesPage() {
  const requests = await prisma.signatureRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { inscription: { include: { candidat: true } } },
  });
  const demo = !yousignConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Signatures électroniques</h1>
        <p className="text-sm text-muted-foreground">
          Suivi des demandes de signature (Yousign).
          {demo && " Mode démo — renseignez YOUSIGN_API_KEY pour l'envoi réel."}
        </p>
      </div>

      <Card>
        {requests.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <PenLine className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucune demande de signature</p>
            <p className="text-sm text-muted-foreground">
              Demandez une signature depuis un document ou une feuille d&apos;émargement.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Concerné</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Demandé le</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => {
                const meta = (r.signataires ?? {}) as { label?: string };
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {meta.label ?? "Document"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.inscription
                        ? `${r.inscription.candidat.prenom} ${r.inscription.candidat.nom}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          r.statut === "SIGNEE"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.statut === "ENVOYEE"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {STATUT_LABELS[r.statut] ?? r.statut}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.createdAt.toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.statut === "ENVOYEE" ? (
                        <form action={markSignatureSigned}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="back" value="/signatures" />
                          <Button type="submit" size="sm" variant="outline">
                            Marquer signé
                          </Button>
                        </form>
                      ) : r.signedAt ? (
                        r.signedAt.toLocaleDateString("fr-FR")
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
