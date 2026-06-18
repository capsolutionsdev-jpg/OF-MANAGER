import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, UserPlus, Users, Building2, UserCog, GraduationCap, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { orgConfigFor } from "@/lib/org-identity";
import { roleLabels } from "@/lib/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/app/(app)/mon-compte/change-password-form";

export const dynamic = "force-dynamic";

const COMPTES = [
  { href: "/administration/comptes/collaborateur", icon: Users, title: "Collaborateur", desc: "Responsable formation, assistant — avec accès par section." },
  { href: "/administration/comptes/client-pro", icon: Building2, title: "Client pro", desc: "Entreprise cliente (B2B) + son espace / portail." },
  { href: "/administration/comptes/formateur", icon: UserCog, title: "Formateur", desc: "Formateur + accès à son espace (sessions, contrats, factures)." },
  { href: "/administration/comptes/candidat", icon: GraduationCap, title: "Candidat", desc: "Candidat + accès apprenant (cours, documents, émargements)." },
];

export default async function AdministrationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const me = session.user;
  const org = await orgConfigFor(me.organismeId ?? null);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ShieldCheck className="h-6 w-6 text-primary" /> Administration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Votre profil, votre mot de passe, et la création des comptes.
        </p>
      </div>

      {/* Créer un compte — chaque type sur sa page */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" /> Créer un compte
          </CardTitle>
          <CardDescription>Choisissez le type de compte à créer.</CardDescription>
        </CardHeader>
        <CardContent>
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
                  <span className="flex items-center gap-1 font-medium">
                    {c.title}
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                  </span>
                  <span className="block text-xs text-muted-foreground">{c.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profil du gérant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mon profil</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Nom</div>
            <div className="font-medium">{me.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">E-mail</div>
            <div className="font-medium">{me.email}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Rôle</div>
            <div className="font-medium">{roleLabels[me.role]}</div>
          </div>
          <div className="sm:col-span-3 text-xs text-muted-foreground">
            Organisme : {org.name} — {org.email}
          </div>
        </CardContent>
      </Card>

      {/* Changer mon mot de passe */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Changer mon mot de passe</CardTitle>
          <CardDescription>8 caractères minimum, avec lettres et chiffres.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
