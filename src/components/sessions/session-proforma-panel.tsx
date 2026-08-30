// src/components/sessions/session-proforma-panel.tsx
// Panneau « Factures proforma » de la page session (Server Component — que des liens).
// Une proforma par candidat (particulier) ou par convention (entreprise groupée).
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import type { ProformaCible } from "@/lib/factures/proforma";

const eur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export function SessionProformaPanel({
  sessionId,
  cibles,
  terminee,
}: {
  sessionId: string;
  cibles: ProformaCible[];
  terminee: boolean;
}) {
  if (cibles.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> Factures proforma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Une proforma par candidat (particulier) ou par convention (entreprise) — document de préparation à
          ressaisir dans votre logiciel de facturation.{" "}
          <a href={`/sessions/${sessionId}/pre-facture`} className="underline">Tout exporter en CSV</a>.
        </p>
        {!terminee && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            La formation n&apos;est pas encore terminée — la proforma reste indicative jusqu&apos;à la fin.
          </p>
        )}
        <ul className="divide-y">
          {cibles.map((c) => (
            <li key={c.key} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{c.clientNom}</span>
                  <Badge variant={c.type === "entreprise" ? "default" : "secondary"}>
                    {c.type === "entreprise" ? "Entreprise" : "Particulier"}
                  </Badge>
                  {c.nbCandidats > 1 && (
                    <span className="text-xs text-muted-foreground">{c.nbCandidats} candidats</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {c.conventionRef ? `Convention ${c.conventionRef} · ` : ""}
                  {eur(c.montantTTC)} TTC{c.exonere ? " (exonéré de TVA)" : ""}
                  {c.sansConvention ? " · entreprise sans convention" : ""}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                render={<a href={`/sessions/${sessionId}/proforma?cible=${encodeURIComponent(c.key)}`} />}
              >
                <Download className="mr-1.5 h-4 w-4" /> PDF
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
