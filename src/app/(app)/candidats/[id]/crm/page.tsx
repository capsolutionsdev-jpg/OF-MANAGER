import { notFound } from "next/navigation";
import { Target, MessageSquare } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { getCandidatDetail } from "@/lib/candidats/detail";
import { CandidatDetailHeader } from "@/components/candidats/candidat-detail-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INTERACTION_LABELS } from "@/lib/validators/crm";
import { CrmPanel } from "@/components/crm/crm-panel";
import { AddInteractionForm } from "@/components/crm/add-interaction-form";
import { CandidatMessagerie } from "@/components/candidats/candidat-messagerie";

export default async function CandidatCrmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCandidatDetail(id);
  if (!detail) notFound();

  const { candidat } = detail;
  const db = await getTenantDb();

  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const messagesPortail = await db.candidatMessage.findMany({
    where: { candidatId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, corps: true, deCandidat: true, auteurNom: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <CandidatDetailHeader candidat={candidat} active="crm" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" /> Suivi commercial (CRM)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CrmPanel
              candidatId={candidat.id}
              crmStage={candidat.crmStage}
              assignedToId={candidat.assignedToId}
              valeurEstimee={
                candidat.valeurEstimee ? String(Number(candidat.valeurEstimee)) : ""
              }
              relanceDate={
                candidat.relanceDate
                  ? candidat.relanceDate.toISOString().slice(0, 10)
                  : ""
              }
              tags={candidat.tags}
              users={users}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" /> Historique des échanges (
              {candidat.interactionsCandidat.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AddInteractionForm candidatId={candidat.id} />
            {candidat.interactionsCandidat.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun échange enregistré.
              </p>
            ) : (
              <ul className="space-y-2">
                {candidat.interactionsCandidat.map((it) => (
                  <li key={it.id} className="rounded-lg border bg-muted/20 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {INTERACTION_LABELS[it.type]}
                        </Badge>
                        {it.sujet ?? "—"}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {it.date.toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {it.contenu && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {it.contenu}
                      </p>
                    )}
                    {it.user?.name && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        par {it.user.name}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" /> Messagerie du portail candidat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CandidatMessagerie
              candidatId={candidat.id}
              messages={messagesPortail.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
