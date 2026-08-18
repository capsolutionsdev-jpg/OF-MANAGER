import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UsersRound, Users, Building2, UserCog, GraduationCap, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Index « Gestion des comptes » (ADMIN de l'OF). Landing de /administration/comptes :
 * un point d'entrée par type (collaborateur / formateur / candidat / client pro),
 * avec le nombre de comptes existants, vers la page dédiée qui liste et crée.
 */
export default async function ComptesIndexPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const db = await getTenantDb();

  const [collaborateurs, formateurs, candidats, clientsPro] = await Promise.all([
    db.user.count({ where: { role: { in: ["ASSISTANT", "RESPONSABLE_FORMATION"] } } }),
    db.formateur.count(),
    db.candidat.count(),
    db.entreprise.count(),
  ]);

  const COMPTES = [
    {
      href: "/administration/comptes/collaborateur",
      icon: Users,
      title: "Collaborateurs",
      desc: "Responsable formation, assistant — avec accès par section.",
      count: collaborateurs,
    },
    {
      href: "/administration/comptes/formateur",
      icon: UserCog,
      title: "Formateurs",
      desc: "Formateurs + accès à leur espace (sessions, contrats, factures).",
      count: formateurs,
    },
    {
      href: "/administration/comptes/candidat",
      icon: GraduationCap,
      title: "Candidats",
      desc: "Candidats + accès apprenant (cours, documents, émargements).",
      count: candidats,
    },
    {
      href: "/administration/comptes/client-pro",
      icon: Building2,
      title: "Clients pro",
      desc: "Entreprises clientes (B2B) + leur espace / portail.",
      count: clientsPro,
    },
  ];

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
          Gérez et créez les comptes de votre organisme — chaque type sur sa page dédiée.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {COMPTES.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex items-start gap-3 rounded-lg border p-4 transition hover:border-primary hover:bg-muted/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <c.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-medium">
                {c.title}
                <span className="rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
                  {c.count}
                </span>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{c.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
