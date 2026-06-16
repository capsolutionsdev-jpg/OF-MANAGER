import { LifeBuoy, Send, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SupportStatutSelect } from "@/components/console/statut-actions";
import { replySupportTicket } from "@/lib/actions/console-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PRIO_LABEL: Record<string, string> = { BASSE: "Basse", NORMALE: "Normale", HAUTE: "Haute", URGENTE: "Urgente" };
const PRIO_BADGE: Record<string, string> = {
  BASSE: "bg-slate-500/10 text-slate-600",
  NORMALE: "bg-blue-500/10 text-blue-700",
  HAUTE: "bg-amber-500/10 text-amber-700",
  URGENTE: "bg-rose-500/10 text-rose-700",
};

function fmt(d: Date) {
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function ConsoleSupportPage() {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: [{ nonLuSupport: "desc" }, { updatedAt: "desc" }],
    include: {
      organisme: { select: { nom: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  const ouverts = tickets.filter((t) => t.statut !== "RESOLU").length;
  const nonLus = tickets.filter((t) => t.nonLuSupport).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support technique"
        subtitle={`${tickets.length} ticket${tickets.length > 1 ? "s" : ""} · ${ouverts} ouvert${ouverts > 1 ? "s" : ""} · ${nonLus} non lu${nonLus > 1 ? "s" : ""}`}
      />

      <div className="space-y-4">
        {tickets.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucun ticket de support pour le moment.</p>
            </CardContent>
          </Card>
        )}

        {tickets.map((t) => (
          <Card key={t.id} className={cn(t.nonLuSupport && "ring-1 ring-primary/40")}>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 py-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  {t.nonLuSupport && <span className="h-2 w-2 rounded-full bg-primary" />}
                  {t.sujet}
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t.organisme.nom}</span>
                  {" · "}{t.demandeurNom ?? "—"}{t.demandeurEmail ? ` (${t.demandeurEmail})` : ""}
                  {" · "}{fmt(t.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={PRIO_BADGE[t.priorite]}>{PRIO_LABEL[t.priorite]}</Badge>
                <SupportStatutSelect id={t.id} statut={t.statut} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {t.messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.parSupport ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                        m.parSupport ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}
                    >
                      <div className="whitespace-pre-wrap">{m.corps}</div>
                      <div className={cn("mt-1 text-[10px]", m.parSupport ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {m.parSupport ? "Vous (support)" : m.auteurNom ?? t.organisme.nom} · {fmt(m.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form action={replySupportTicket} className="flex items-end gap-2 border-t pt-3">
                <input type="hidden" name="ticketId" value={t.id} />
                <Textarea name="message" required rows={1} placeholder="Répondre au client…" className="min-h-9 flex-1" />
                <Button type="submit" size="sm"><Send className="mr-1.5 h-4 w-4" /> Répondre</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
