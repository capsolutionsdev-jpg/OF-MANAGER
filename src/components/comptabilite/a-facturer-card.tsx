// src/components/comptabilite/a-facturer-card.tsx
// Carte « À facturer » de la comptabilité : sessions terminées avec des participants
// pas encore facturés → renvoie vers la page session pour générer les proformas.
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";
import type { SessionAFacturer } from "@/lib/factures/a-facturer";

const eur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";
const dfr = (d: Date) => d.toLocaleDateString("fr-FR");

export function AFacturerCard({ sessions }: { sessions: SessionAFacturer[] }) {
  if (sessions.length === 0) return null;
  const s2 = sessions.length > 1 ? "s" : "";
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" /> À facturer — {sessions.length} session{s2} terminée{s2}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {sessions.slice(0, 8).map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{s.formationTitre}</div>
                <div className="text-xs text-muted-foreground">
                  Terminée le {dfr(s.dateFin)} · {s.nbAFacturer} à facturer · ~{eur(s.totalEstime)}
                </div>
              </div>
              <Button variant="ghost" size="sm" render={<Link href={`/sessions/${s.id}`} />}>
                Proformas <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
        {sessions.length > 8 && (
          <div className="px-4 py-2 text-xs text-muted-foreground">
            + {sessions.length - 8} autre(s) session(s) terminée(s) à facturer.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
