import { redirect } from "next/navigation";
import { Users, ShieldCheck, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { orgConfig } from "@/lib/org-config";
import { roleLabels } from "@/lib/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/app/(app)/mon-compte/change-password-form";
import { CollaborateurForm } from "@/components/admin/collaborateur-form";
import { CollaborateurRow } from "@/components/admin/collaborateur-row";

export const dynamic = "force-dynamic";

export default async function AdministrationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const me = session.user;

  const collaborateurs = await prisma.user.findMany({
    where: { role: { in: ["ASSISTANT", "RESPONSABLE_FORMATION"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      permissions: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ShieldCheck className="h-6 w-6 text-primary" /> Administration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vos informations, votre mot de passe, et la gestion des comptes collaborateurs.
        </p>
      </div>

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
            Organisme : {orgConfig.name} — {orgConfig.email}
          </div>
        </CardContent>
      </Card>

      {/* Changer mon mot de passe */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Changer mon mot de passe</CardTitle>
          <CardDescription>
            8 caractères minimum, avec lettres et chiffres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      {/* Créer un collaborateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" /> Créer un compte collaborateur
          </CardTitle>
          <CardDescription>
            Définissez son e-mail, son mot de passe et les sections auxquelles il a accès.
            Il pourra se connecter immédiatement sur la plateforme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CollaborateurForm />
        </CardContent>
      </Card>

      {/* Liste des collaborateurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Collaborateurs ({collaborateurs.length})
          </CardTitle>
          <CardDescription>
            Modifiez les droits, réinitialisez un mot de passe, désactivez ou supprimez un compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {collaborateurs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun collaborateur pour le moment. Créez-en un avec le formulaire ci-dessus.
            </p>
          ) : (
            collaborateurs.map((c) => <CollaborateurRow key={c.id} c={c} />)
          )}
          <p className="text-xs text-muted-foreground">
            ℹ️ Un changement de droits prend effet à la prochaine connexion du collaborateur.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
