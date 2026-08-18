import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UsersRound, Users, UserCog, GraduationCap, UserPlus, Building2 } from "lucide-react";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roleLabels } from "@/lib/navigation";
import { CompteActions } from "@/components/admin/compte-actions";
import type { CompteType } from "@/lib/actions/comptes-actions";

export const dynamic = "force-dynamic";

type Row = { id: string; label: string; sub: string | null; actif: boolean; hasLogin: boolean };

/**
 * Gestion des comptes de l'organisme (ADMIN) : liste par type avec suspension /
 * réactivation (du compte de connexion) et suppression. La création reste sur les
 * pages dédiées (liens « Créer »).
 */
export default async function ComptesGestionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const db = await getTenantDb();

  const [collab, formateurs, candidats, candidatsTotal, entreprises] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["ASSISTANT", "RESPONSABLE_FORMATION"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, isActive: true, fonction: true },
    }),
    db.formateur.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, prenom: true, email: true, userId: true, user: { select: { isActive: true } } },
    }),
    db.candidat.findMany({
      where: { apprenant: { isNot: null } },
      orderBy: { nom: "asc" },
      take: 100,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        apprenant: { select: { userId: true, user: { select: { isActive: true } } } },
      },
    }),
    db.candidat.count(),
    db.entreprise.count(),
  ]);

  const collabRows: Row[] = collab.map((u) => ({
    id: u.id,
    label: u.name ?? u.email,
    sub: `${u.email} · ${roleLabels[u.role]}${u.fonction ? " — " + u.fonction : ""}`,
    actif: u.isActive,
    hasLogin: true,
  }));
  const formateurRows: Row[] = formateurs.map((f) => ({
    id: f.id,
    label: `${f.prenom} ${f.nom}`.trim(),
    sub: f.email,
    actif: f.user?.isActive ?? false,
    hasLogin: !!f.userId,
  }));
  const candidatRows: Row[] = candidats.map((c) => ({
    id: c.id,
    label: `${c.prenom} ${c.nom}`.trim(),
    sub: c.email,
    actif: c.apprenant?.user?.isActive ?? false,
    hasLogin: !!c.apprenant?.userId,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/administration"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Administration
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <UsersRound className="h-6 w-6 text-primary" /> Gestion des comptes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suspendez, réactivez ou supprimez les comptes de votre organisme. La création se fait sur
          chaque page dédiée (bouton «&nbsp;Créer&nbsp;»).
        </p>
      </div>

      <Section
        title="Collaborateurs"
        icon={Users}
        type="collaborateur"
        createHref="/administration/comptes/collaborateur"
        rows={collabRows}
        emptyLabel="Aucun collaborateur."
      />
      <Section
        title="Formateurs"
        icon={UserCog}
        type="formateur"
        createHref="/administration/comptes/formateur"
        rows={formateurRows}
        emptyLabel="Aucun formateur."
      />
      <Section
        title="Candidats (avec compte apprenant)"
        icon={GraduationCap}
        type="candidat"
        createHref="/administration/comptes/candidat"
        rows={candidatRows}
        emptyLabel="Aucun candidat avec un compte d'accès."
        note={`${candidatsTotal} candidat(s) au total ; seuls ceux disposant d'un accès apprenant sont listés ici (100 max).`}
      />

      {/* Clients pro : gérés sur leur page dédiée */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 py-3">
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" /> Clients pro ({entreprises})
          </CardTitle>
          <Link
            href="/administration/comptes/client-pro"
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
          >
            <UserPlus className="h-3.5 w-3.5" /> Gérer / créer
          </Link>
        </CardHeader>
      </Card>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  type,
  createHref,
  rows,
  emptyLabel,
  note,
}: {
  title: string;
  icon: typeof Users;
  type: CompteType;
  createHref: string;
  rows: Row[];
  emptyLabel: string;
  note?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 py-3">
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4" /> {title} ({rows.length})
        </CardTitle>
        <Link
          href={createHref}
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
        >
          <UserPlus className="h-3.5 w-3.5" /> Créer
        </Link>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{emptyLabel}</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{r.label}</span>
                {r.hasLogin ? (
                  r.actif ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Actif</Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">Suspendu</Badge>
                  )
                ) : (
                  <Badge variant="secondary">Sans accès</Badge>
                )}
              </div>
              {r.sub && <div className="truncate text-xs text-muted-foreground">{r.sub}</div>}
            </div>
            <CompteActions type={type} id={r.id} actif={r.actif} hasLogin={r.hasLogin} />
          </div>
        ))}
        {note && <p className="pt-1 text-[11px] text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}
