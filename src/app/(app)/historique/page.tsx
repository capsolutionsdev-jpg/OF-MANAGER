import { History, UserPlus, PenLine, FolderCheck, Award, MessageSquare } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { getCurrentApprenant } from "@/lib/candidat-portal";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

type Event = { date: Date; icon: typeof PenLine; label: string };

export default async function HistoriquePage() {
  const apprenant = await getCurrentApprenant();
  if (!apprenant) {
    return (
      <div className="space-y-4">
        <PageHeader title="Historique" />
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Aucun dossier candidat associé.</CardContent></Card>
      </div>
    );
  }

  const db = await getTenantDb();
  const [inscriptions, messages] = await Promise.all([
    db.inscription.findMany({
      where: { candidatId: apprenant.candidatId, statut: { not: "ANNULEE" } },
      select: {
        id: true, createdAt: true, signedAt: true, certificationDate: true, resultatCertification: true,
        session: { select: { formation: { select: { titre: true } } } },
      },
    }),
    db.candidatMessage.findMany({
      where: { candidatId: apprenant.candidatId },
      select: { id: true, createdAt: true, deCandidat: true },
    }),
  ]);
  const inscriptionIds = inscriptions.map((i) => i.id);
  const diplomes = inscriptionIds.length
    ? await db.diplome.findMany({ where: { inscriptionId: { in: inscriptionIds } }, select: { remisAt: true } })
    : [];

  const events: Event[] = [];
  for (const i of inscriptions) {
    const titre = i.session.formation.titre;
    events.push({ date: i.createdAt, icon: UserPlus, label: `Inscription à « ${titre} »` });
    if (i.signedAt) events.push({ date: i.signedAt, icon: PenLine, label: `Documents signés — ${titre}` });
    if (i.resultatCertification === "CERTIFIE" && i.certificationDate)
      events.push({ date: i.certificationDate, icon: Award, label: `Certification obtenue — ${titre}` });
  }
  for (const d of diplomes) if (d.remisAt) events.push({ date: d.remisAt, icon: FolderCheck, label: "Diplôme remis" });
  for (const m of messages)
    events.push({ date: m.createdAt, icon: MessageSquare, label: m.deCandidat ? "Message envoyé à l'organisme" : "Message reçu de l'organisme" });

  events.sort((a, b) => b.date.getTime() - a.date.getTime());
  const fmt = (d: Date) => d.toLocaleString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Historique" subtitle="La chronologie de votre parcours." icon={History} />

      {events.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Aucun événement pour le moment.</CardContent></Card>
      ) : (
        <div className="relative space-y-4 border-l-2 border-muted pl-6">
          {events.map((e, idx) => (
            <div key={idx} className="relative">
              <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-background">
                <e.icon className="h-3.5 w-3.5" />
              </span>
              <p className="text-sm font-medium">{e.label}</p>
              <p className="text-xs text-muted-foreground">{fmt(e.date)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
