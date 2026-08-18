import Link from "next/link";
import { CalendarDays, Megaphone, ChevronRight } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SOCIAL_PLATFORMS } from "@/lib/social-platforms";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function CommunicationPage() {
  const db = await getTenantDb();
  const sessions = await db.session.findMany({
    orderBy: { dateDebut: "desc" },
    take: 100,
    select: {
      id: true,
      dateDebut: true,
      dateFin: true,
      modalite: true,
      lieu: true,
      formation: { select: { titre: true } },
      socialAssets: { select: { statut: true } },
    },
  });

  const now = new Date();
  const total = SOCIAL_PLATFORMS.length;

  // Sessions à venir d'abord (les plus utiles à promouvoir), puis les passées.
  const ordered = [...sessions].sort((a, b) => {
    const au = a.dateDebut >= now ? 0 : 1;
    const bu = b.dateDebut >= now ? 0 : 1;
    if (au !== bu) return au - bu;
    return au === 0
      ? a.dateDebut.getTime() - b.dateDebut.getTime() // à venir : plus proche en premier
      : b.dateDebut.getTime() - a.dateDebut.getTime(); // passées : plus récente en premier
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réseaux sociaux"
        subtitle="Générez, validez et exportez des posts prêts à publier pour promouvoir vos sessions — LinkedIn, Instagram, Facebook, X, TikTok, YouTube, WhatsApp."
      />

      {ordered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Aucune session à promouvoir"
          description="Créez une session de formation : vous pourrez ensuite générer automatiquement les contenus pour vos réseaux."
          actionLabel="Créer une session"
          actionHref="/sessions/nouvelle"
        />
      ) : (
        <div className="grid gap-2.5">
          {ordered.map((s) => {
            const gen = s.socialAssets.length;
            const approuve = s.socialAssets.filter((a) => a.statut === "APPROUVE").length;
            const aValider = s.socialAssets.filter((a) => a.statut === "A_VALIDER" || a.statut === "BROUILLON").length;
            const upcoming = s.dateDebut >= now;
            return (
              <Card key={s.id} className="p-0">
                <Link
                  href={`/communication/${s.id}`}
                  className="flex items-center gap-4 rounded-[inherit] p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{s.formation.titre}</span>
                      <Badge variant={upcoming ? "default" : "secondary"}>{upcoming ? "À venir" : "Passée"}</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="size-3.5 shrink-0" />
                      {fmt(s.dateDebut)} → {fmt(s.dateFin)}
                      {s.modalite !== "DISTANCIEL" && s.lieu ? ` · ${s.lieu}` : ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {gen === 0 ? (
                      <Badge variant="outline">Non généré</Badge>
                    ) : (
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Badge variant="secondary">{gen}/{total} générés</Badge>
                        {approuve > 0 && (
                          <Badge variant="default" className="bg-emerald-600 text-white">
                            {approuve} approuvé{approuve > 1 ? "s" : ""}
                          </Badge>
                        )}
                        {aValider > 0 && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                            {aValider} à valider
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
