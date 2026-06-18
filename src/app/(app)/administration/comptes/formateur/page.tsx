import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserCog } from "lucide-react";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormateurAccountForm } from "@/components/admin/account-forms";

export const dynamic = "force-dynamic";

export default async function CompteFormateurPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/administration" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Administration
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <UserCog className="h-6 w-6 text-primary" /> Créer un compte formateur
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crée le formateur et son accès « espace formateur » (sessions, contrats, facturation).
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Nouveau formateur + accès</CardTitle></CardHeader>
        <CardContent><FormateurAccountForm /></CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Pour gérer un formateur existant (formations animées, contrats, factures), ouvrez sa fiche dans{" "}
        <Link href="/formateurs" className="text-primary hover:underline">Formateurs</Link>.
      </p>
    </div>
  );
}
