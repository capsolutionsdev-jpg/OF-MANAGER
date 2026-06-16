import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { getNotifications, type NotifSeverity } from "@/lib/notifications";
import { markNotificationsRead } from "@/lib/actions/notification-actions";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const DOT: Record<NotifSeverity, string> = {
  info: "bg-blue-500",
  warn: "bg-amber-500",
  danger: "bg-red-500",
};

function ago(iso: string) {
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const days = Math.floor(s / 86400);
  if (days < 30) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR");
}

export default async function NotificationsPage() {
  await requireSection("notifications");
  const { items, unread, seenAt } = await getNotifications();
  const seen = seenAt ? new Date(seenAt) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications & alertes"
        subtitle={
          items.length === 0
            ? "Tout est à jour"
            : `${items.length} alerte${items.length > 1 ? "s" : ""}${unread > 0 ? ` · ${unread} non lue${unread > 1 ? "s" : ""}` : ""}`
        }
      >
        {items.length > 0 && (
          <form action={markNotificationsRead}>
            <Button type="submit" variant="outline">
              <CheckCheck className="mr-1.5 h-4 w-4" /> Tout marquer comme lu
            </Button>
          </form>
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Aucune alerte en cours</p>
              <p className="text-sm text-muted-foreground">
                Les nouveaux prospects, relances dues, devis à signer, tâches en retard et
                factures à encaisser apparaîtront ici.
              </p>
            </div>
          ) : (
            items.map((n) => {
              const isUnread = !seen || new Date(n.date) > seen;
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  className={`flex items-start gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted ${
                    isUnread ? "bg-primary/[0.04]" : ""
                  }`}
                >
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[n.severity]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {n.category}
                    </p>
                    <p className="font-medium">{n.title}</p>
                    {n.detail && <p className="text-sm text-muted-foreground">{n.detail}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground/70">{ago(n.date)}</span>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
