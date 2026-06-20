import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidatAccountForm } from "@/components/admin/account-forms";

export const dynamic = "force-dynamic";

export default async function CompteCandidatPage() {
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
          <GraduationCap className="h-6 w-6 text-primary" /> Créer un compte candidat
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crée le candidat et son accès « espace apprenant » (cours en ligne, documents, émargements).
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Nouveau candidat + accès</CardTitle></CardHeader>
        <CardContent><CandidatAccountForm /></CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Pour un candidat existant (dossier, inscriptions, pièces), ouvrez sa fiche dans{" "}
        <Link href="/candidats" className="text-primary hover:underline">Candidats</Link>, ou attribuez ses cours dans{" "}
        <Link href="/elearning/apprenants" className="text-primary hover:underline">E-learning → Apprenants</Link>.
      </p>
    </div>
  );
}
