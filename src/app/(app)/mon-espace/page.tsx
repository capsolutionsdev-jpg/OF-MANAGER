import Link from "next/link";
import {
  CalendarClock, PlayCircle, CheckCircle2, PenLine, FolderUp, FileText,
  GraduationCap, BookOpen, Mail, UserCircle, ArrowRight, Award,
} from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { getCurrentApprenant, sessionPhase } from "@/lib/candidat-portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

export default async function MonEspacePage() {
  const session = await auth();
  const prenom = (session?.user?.name ?? "").split(" ")[0];
  const apprenant = await getCurrentApprenant();

  if (!apprenant) {
    return (
      <div className="space-y-4">
        <PageHeader title="Mon espace" />
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Aucun dossier candidat associé à ce compte. Contactez votre organisme de formation.
          </CardContent>
        </Card>
      </div>
    );
  }

  const db = await getTenantDb();
  const inscriptions = await db.inscription.findMany({
    where: { candidatId: apprenant.candidatId, statut: { not: "ANNULEE" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, accessToken: true, signedAt: true, piecesRecues: true, resultatCertification: true,
      session: {
        select: {
          dateDebut: true, dateFin: true, lieu: true, horaires: true,
          formation: { select: { titre: true, piecesAttendues: true } },
        },
      },
    },
  });

  const avenir = inscriptions.filter((i) => sessionPhase(i.session.dateDebut, i.session.dateFin) === "AVENIR");
  const enCours = inscriptions.filter((i) => sessionPhase(i.session.dateDebut, i.session.dateFin) === "EN_COURS");
  const terminees = inscriptions.filter((i) => sessionPhase(i.session.dateDebut, i.session.dateFin) === "TERMINEE");
  const aSigner = inscriptions.filter((i) => !i.signedAt && i.accessToken);
  const piecesManquantes = inscriptions.filter(
    (i) => i.session.formation.piecesAttendues.some((p) => !i.piecesRecues.includes(p)),
  );

  const prochaine = [...avenir].sort((a, b) => a.session.dateDebut.getTime() - b.session.dateDebut.getTime())[0];

  const raccourcis = [
    { href: "/mes-formations", label: "Mes formations", icon: BookOpen },
    { href: "/mes-documents", label: "Mes documents", icon: FileText },
    { href: "/mes-certificats", label: "Mes certificats", icon: Award },
    { href: "/mes-cours", label: "Mes cours en ligne", icon: GraduationCap },
    { href: "/catalogue", label: "Catalogue", icon: BookOpen },
    { href: "/messagerie", label: "Messagerie", icon: Mail },
    { href: "/mon-profil", label: "Mon profil", icon: UserCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bonjour {prenom} 👋</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Bienvenue dans votre espace : suivez vos formations, vos documents et échangez avec votre organisme.
        </p>
      </div>

      {/* Indicateurs */}
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="À venir" value={avenir.length} icon={CalendarClock} tint="blue" />
        <StatCard label="En cours" value={enCours.length} icon={PlayCircle} tint="violet" />
        <StatCard label="Terminées" value={terminees.length} icon={CheckCircle2} tint="emerald" />
        <StatCard label="À signer" value={aSigner.length} icon={PenLine} tint={aSigner.length ? "amber" : "emerald"} />
      </div>

      {/* Actions à traiter */}
      {(aSigner.length > 0 || piecesManquantes.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À traiter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {aSigner.map((i) => (
              <Link key={i.id} href={`/parcours/${i.accessToken}`}
                className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm hover:bg-warning/20">
                <span className="flex items-center gap-2"><PenLine className="h-4 w-4 text-warning" /> Documents à signer — {i.session.formation.titre}</span>
                <ArrowRight className="h-4 w-4 text-warning" />
              </Link>
            ))}
            {piecesManquantes.map((i) => {
              const manq = i.session.formation.piecesAttendues.filter((p) => !i.piecesRecues.includes(p));
              return (
                <Link key={i.id} href={i.accessToken ? `/parcours/${i.accessToken}` : "/mes-documents"}
                  className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm hover:bg-warning/20">
                  <span className="flex items-center gap-2"><FolderUp className="h-4 w-4 text-warning" /> {manq.length} pièce{manq.length > 1 ? "s" : ""} à fournir — {i.session.formation.titre}</span>
                  <ArrowRight className="h-4 w-4 text-warning" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Prochaine formation */}
      {prochaine && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" /> Prochaine formation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">{prochaine.session.formation.titre}</div>
            <p className="text-sm text-muted-foreground">
              Du {fmt(prochaine.session.dateDebut)} au {fmt(prochaine.session.dateFin)}
              {prochaine.session.horaires ? ` · ${prochaine.session.horaires}` : ""}
              {prochaine.session.lieu ? ` · ${prochaine.session.lieu}` : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Raccourcis */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {raccourcis.map((r) => (
          <Link key={r.href} href={r.href}
            className="hover-lift flex items-center gap-3 rounded-xl border bg-card p-4 text-sm font-medium ring-1 ring-foreground/[0.04]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <r.icon className="h-5 w-5" />
            </span>
            {r.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
