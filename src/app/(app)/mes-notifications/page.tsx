import Link from "next/link";
import { BellRing, PenLine, FolderUp, MessageSquare, Award, CheckCircle2, ArrowRight } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { getCurrentApprenant } from "@/lib/candidat-portal";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

type Notif = { icon: typeof PenLine; label: string; href: string; tint: string };

export default async function MesNotificationsPage() {
  const apprenant = await getCurrentApprenant();
  if (!apprenant) {
    return (
      <div className="space-y-4">
        <PageHeader title="Notifications" />
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Aucun dossier candidat associé.</CardContent></Card>
      </div>
    );
  }

  const db = await getTenantDb();
  const [inscriptions, msgNonLus] = await Promise.all([
    db.inscription.findMany({
      where: { candidatId: apprenant.candidatId, statut: { not: "ANNULEE" } },
      select: {
        accessToken: true, signedAt: true, piecesRecues: true,
        session: { select: { formation: { select: { titre: true, piecesAttendues: true } } } },
      },
    }),
    db.candidatMessage.count({ where: { candidatId: apprenant.candidatId, deCandidat: false, luParCandidat: false } }),
  ]);

  const notifs: Notif[] = [];
  for (const i of inscriptions) {
    if (!i.signedAt && i.accessToken) {
      notifs.push({ icon: PenLine, label: `Documents à signer — ${i.session.formation.titre}`, href: `/parcours/${i.accessToken}`, tint: "text-warning" });
    }
    const manq = i.session.formation.piecesAttendues.filter((p) => !i.piecesRecues.includes(p));
    if (manq.length > 0) {
      notifs.push({ icon: FolderUp, label: `${manq.length} pièce(s) à fournir — ${i.session.formation.titre}`, href: i.accessToken ? `/parcours/${i.accessToken}` : "/mes-documents", tint: "text-warning" });
    }
  }
  if (msgNonLus > 0) {
    notifs.push({ icon: MessageSquare, label: `${msgNonLus} nouveau(x) message(s) de votre organisme`, href: "/messagerie", tint: "text-primary" });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Notifications" subtitle="Ce qui requiert votre attention." icon={BellRing} />

      {notifs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="font-medium">Vous êtes à jour 🎉</p>
            <p className="text-sm text-muted-foreground">Aucune action en attente pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifs.map((n, idx) => (
            <Link key={idx} href={n.href}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm hover-lift">
              <span className="flex items-center gap-3">
                <n.icon className={`h-5 w-5 ${n.tint}`} /> {n.label}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        <Award className="mr-1 inline h-3.5 w-3.5" />
        Vos nouveaux certificats apparaissent dans « Mes certificats ».
      </p>
    </div>
  );
}
