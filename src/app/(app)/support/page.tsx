import { LifeBuoy, Send, MessageSquare } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSupportTicket, replyTicketClient } from "@/lib/actions/support-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUT_LABEL: Record<string, string> = { OUVERT: "Ouvert", EN_COURS: "En cours", RESOLU: "Résolu" };
const STATUT_BADGE: Record<string, string> = {
  OUVERT: "bg-amber-500/10 text-amber-700",
  EN_COURS: "bg-blue-500/10 text-blue-700",
  RESOLU: "bg-emerald-500/10 text-emerald-700",
};
const PRIO_LABEL: Record<string, string> = { BASSE: "Basse", NORMALE: "Normale", HAUTE: "Haute", URGENTE: "Urgente" };

function fmt(d: Date) {
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function SupportPage() {
  const db = await getTenantDb();
  const tickets = await db.supportTicket.findMany({
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support technique"
        subtitle="Un problème ou une question sur votre plateforme ? Contactez notre équipe — nous vous répondons ici."
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Nouveau ticket */}
        <Card className="h-fit">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <LifeBuoy className="h-4 w-4 text-primary" /> Contacter le support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createSupportTicket} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sujet">Sujet *</Label>
                <Input id="sujet" name="sujet" required placeholder="Ex. Problème d'envoi des convocations" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priorite">Priorité</Label>
                <select
                  id="priorite"
                  name="priorite"
                  defaultValue="NORMALE"
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                >
                  {Object.entries(PRIO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Message *</Label>
                <Textarea id="message" name="message" required rows={5} placeholder="Décrivez votre problème ou votre demande de renseignement…" />
              </div>
              <Button type="submit" className="w-full">
                <Send className="mr-2 h-4 w-4" /> Envoyer la demande
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Mes tickets */}
        <div className="space-y-4">
          {tickets.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <MessageSquare className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucune demande pour le moment.</p>
                <p className="text-xs text-muted-foreground">Utilisez le formulaire pour contacter le support.</p>
              </CardContent>
            </Card>
          )}

          {tickets.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 py-3">
                <div>
                  <CardTitle className="text-sm">{t.sujet}</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Priorité {PRIO_LABEL[t.priorite]} · ouvert le {fmt(t.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.nonLuClient && <Badge className="bg-primary/10 text-primary">Nouvelle réponse</Badge>}
                  <Badge className={STATUT_BADGE[t.statut]}>{STATUT_LABEL[t.statut]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {t.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn("flex", m.parSupport ? "justify-start" : "justify-end")}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                          m.parSupport
                            ? "bg-muted text-foreground"
                            : "bg-primary text-primary-foreground",
                        )}
                      >
                        <div className="whitespace-pre-wrap">{m.corps}</div>
                        <div className={cn("mt-1 text-[10px]", m.parSupport ? "text-muted-foreground" : "text-primary-foreground/70")}>
                          {m.parSupport ? "Support OFManager" : m.auteurNom ?? "Vous"} · {fmt(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {t.statut !== "RESOLU" && (
                  <form action={replyTicketClient} className="flex items-end gap-2 border-t pt-3">
                    <input type="hidden" name="ticketId" value={t.id} />
                    <Textarea name="message" required rows={1} placeholder="Répondre…" className="min-h-9 flex-1" />
                    <Button type="submit" size="sm"><Send className="h-4 w-4" /></Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
