import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { getCandidatDetail } from "@/lib/candidats/detail";
import { CandidatDetailHeader } from "@/components/candidats/candidat-detail-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function CandidatHistoriquePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCandidatDetail(id);
  if (!detail) notFound();

  const { candidat } = detail;
  const db = await getTenantDb();

  const logs = await db.auditLog.findMany({
    where: { entityType: "Candidat", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: true },
  });

  return (
    <div className="space-y-6">
      <CandidatDetailHeader candidat={candidat} active="historique" t3pTab={detail.t3pTab} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune action enregistrée.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <span>
                    <span className="font-medium">{log.action}</span>
                    {log.user ? (
                      <span className="text-muted-foreground"> — {log.user.name}</span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">
                    {log.createdAt.toLocaleString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
