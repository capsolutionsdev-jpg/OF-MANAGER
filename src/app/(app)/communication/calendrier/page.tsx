import Link from "next/link";
import { ArrowLeft, CalendarClock, AlertTriangle } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { platformByEnum } from "@/lib/social-platforms";
import { ModulePending, isMissingTable } from "@/components/communication/module-pending";

export const dynamic = "force-dynamic";

const dayKey = (d: Date) =>
  d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const hm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default async function CalendrierPage() {
  const db = await getTenantDb();
  const rows = await db.socialContentAsset
    .findMany({
      where: { scheduledAt: { not: null }, publishedAt: null },
      orderBy: { scheduledAt: "asc" },
      take: 300,
      select: {
        id: true,
        platform: true,
        scheduledAt: true,
        session: { select: { id: true, formation: { select: { titre: true } } } },
      },
    })
    .catch((e: unknown) => {
      if (isMissingTable(e)) return "MISSING" as const;
      throw e;
    });

  const back = (
    <Link
      href="/communication"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Réseaux sociaux
    </Link>
  );

  if (rows === "MISSING") {
    return (
      <div className="space-y-6">
        {back}
        <ModulePending />
      </div>
    );
  }

  const list = rows;
  const now = new Date();

  // Groupement par jour (déjà trié par date croissante).
  type Row = (typeof list)[number];
  const groups = new Map<string, Row[]>();
  for (const r of list) {
    if (!r.scheduledAt) continue;
    const k = dayKey(r.scheduledAt);
    const arr = groups.get(k);
    if (arr) arr.push(r);
    else groups.set(k, [r]);
  }

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        title="Calendrier de publication"
        subtitle="Vos posts planifiés, à publier à la main au moment prévu. (Aucune publication automatique.)"
      />

      {list.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Rien de planifié"
          description="Depuis une session, planifiez la date de publication d'un post : il apparaîtra ici."
        />
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([day, items]) => (
            <div key={day} className="space-y-2">
              <h3 className="text-sm font-semibold capitalize text-muted-foreground">{day}</h3>
              <div className="grid gap-2">
                {items.map((r) => {
                  const late = r.scheduledAt! < now;
                  const p = platformByEnum(r.platform);
                  return (
                    <Card key={r.id} className="p-0">
                      <Link
                        href={`/communication/${r.session.id}`}
                        className="flex items-center gap-3 rounded-[inherit] p-3 transition-colors hover:bg-muted/40"
                      >
                        <span className="w-12 shrink-0 tabular-nums text-sm font-medium">{hm(r.scheduledAt!)}</span>
                        <Badge variant="secondary" className="shrink-0">
                          {p?.label ?? r.platform}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate text-sm">{r.session.formation.titre}</span>
                        {late && (
                          <Badge variant="outline" className="shrink-0 border-amber-500/40 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="mr-1 size-3" /> En retard
                          </Badge>
                        )}
                      </Link>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
