import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CollaborateurForm } from "@/components/admin/collaborateur-form";
import { CollaborateurRow } from "@/components/admin/collaborateur-row";

export const dynamic = "force-dynamic";

export default async function CompteCollaborateurPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const db = await getTenantDb();

  const collaborateurs = await db.user.findMany({
    where: { role: { in: ["ASSISTANT", "RESPONSABLE_FORMATION"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, isActive: true, permissions: true },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/administration" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Administration
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <UserPlus className="h-6 w-6 text-primary" /> Créer un compte collaborateur
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personnel administratif (responsable formation, assistant). Définissez ses accès par section.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Nouveau collaborateur</CardTitle></CardHeader>
        <CardContent><CollaborateurForm /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Collaborateurs ({collaborateurs.length})
          </CardTitle>
          <CardDescription>Modifiez les droits, réinitialisez un mot de passe, désactivez ou supprimez un compte.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {collaborateurs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun collaborateur pour le moment.</p>
          ) : (
            collaborateurs.map((c) => <CollaborateurRow key={c.id} c={c} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
