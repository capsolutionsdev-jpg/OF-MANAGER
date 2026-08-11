import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CollaborateurForm } from "@/components/admin/collaborateur-form";
import { CollaborateurRow } from "@/components/admin/collaborateur-row";
import { getSeatInfo, EXTRA_SEAT_PRICE_EUR } from "@/lib/seats";

export const dynamic = "force-dynamic";

export default async function CompteCollaborateurPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const db = await getTenantDb();

  const seat = session.user.organismeId ? await getSeatInfo(session.user.organismeId) : null;

  const collaborateurs = await db.user.findMany({
    where: { role: { in: ["ASSISTANT", "RESPONSABLE_FORMATION"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, fonction: true, isActive: true, permissions: true },
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

      {seat && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            seat.canAdd ? "bg-muted/40" : "border-amber-300 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300"
          }`}
        >
          <span className="font-medium">
            Comptes back-office : {seat.used}
            {seat.limit != null ? ` / ${seat.limit}` : " (illimité)"}
          </span>
          {seat.limit != null && !seat.canAdd && " — limite atteinte"}
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {seat.included == null
              ? "Votre formule inclut un nombre illimité de comptes."
              : `Votre formule inclut ${seat.included} compte(s).`}{" "}
            Compte supplémentaire : {EXTRA_SEAT_PRICE_EUR} € HT/mois (contactez OFManager).
          </span>
        </div>
      )}

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
