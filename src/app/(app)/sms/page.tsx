import { MessageSquare } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SendSmsForm, type SmsRecipient } from "@/components/sms/send-sms-form";

export const dynamic = "force-dynamic";

const STATUT_BADGE: Record<string, string> = {
  ENVOYE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  DEMO: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  ECHEC: "bg-red-500/10 text-red-700 dark:text-red-300",
  EN_ATTENTE: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export default async function SmsPage() {
  const db = await getTenantDb();
  const [candidats, logs] = await Promise.all([
    db.candidat.findMany({
      where: { statut: { not: "ARCHIVE" } },
      select: { id: true, prenom: true, nom: true, telephone: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    db.smsLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  const recipients: SmsRecipient[] = candidats.map((c) => ({
    id: c.id,
    label: `${c.prenom} ${c.nom}`,
    phone: c.telephone,
  }));

  const fmt = (d: Date) => d.toLocaleString("fr-FR");

  return (
    <div className="space-y-6">
      <PageHeader
        title="SMS & séquences de relance"
        subtitle="Envoyez convocations, rappels et relances par SMS à vos prospects et stagiaires."
      />

      <SendSmsForm recipients={recipients} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" /> Historique des SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Aucun SMS envoyé pour le moment.
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((l) => (
                <div key={l.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUT_BADGE[l.statut] ?? "bg-muted"}`}>
                    {l.statut}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{l.body}</p>
                    <p className="text-xs text-muted-foreground">{l.destinataire} · {fmt(l.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
