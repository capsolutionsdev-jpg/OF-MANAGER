import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCorbeille } from "@/lib/actions/corbeille-actions";
import { CorbeilleClient } from "./corbeille-client";

export const dynamic = "force-dynamic";

export default async function CorbeillePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const groupes = await getCorbeille();
  const total = groupes.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Trash2 className="h-6 w-6 text-primary" /> Corbeille
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Éléments supprimés par erreur, récupérables. La restauration les remet à
          leur place ; la purge les supprime définitivement.
        </p>
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            La corbeille est vide.
          </CardContent>
        </Card>
      ) : (
        groupes
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <Card key={g.modele}>
              <CardHeader>
                <CardTitle className="text-base">
                  {g.titre} <span className="text-muted-foreground">({g.items.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CorbeilleClient modele={g.modele} items={g.items} />
              </CardContent>
            </Card>
          ))
      )}
    </div>
  );
}
