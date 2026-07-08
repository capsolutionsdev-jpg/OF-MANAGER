import { UserCircle, Mail, KeyRound } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { getCurrentApprenant } from "@/lib/candidat-portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfilForm } from "@/components/portail/profil-form";
import { ChangePasswordForm } from "@/app/(app)/mon-compte/change-password-form";

export const dynamic = "force-dynamic";

export default async function MonProfilPage() {
  const apprenant = await getCurrentApprenant();
  if (!apprenant) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Mon profil</h1>
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Aucun dossier candidat associé.</CardContent></Card>
      </div>
    );
  }

  const db = await getTenantDb();
  const c = await db.candidat.findUnique({
    where: { id: apprenant.candidatId },
    select: { prenom: true, nom: true, email: true, telephone: true, adresse: true, codePostal: true, ville: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <UserCircle className="h-6 w-6" /> Mon profil
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {c?.prenom} {c?.nom}
          {c?.email ? <span className="ml-2 inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {c.email}</span> : null}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Mes coordonnées</CardTitle></CardHeader>
        <CardContent>
          <ProfilForm defaults={{
            telephone: c?.telephone ?? "",
            adresse: c?.adresse ?? "",
            codePostal: c?.codePostal ?? "",
            ville: c?.ville ?? "",
          }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" /> Sécurité — mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
