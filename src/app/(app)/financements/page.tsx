import { Landmark } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTenantDb } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WedofConnexion } from "@/components/financements/wedof-connexion";

export const dynamic = "force-dynamic";

const ETAT_LABEL: Record<string, string> = {
  A_MONTER: "À monter",
  EN_COURS: "En cours",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  A_FACTURER: "À facturer",
  FACTURE: "Facturé",
  SOLDE: "Soldé",
  ANNULE: "Annulé",
};

export default async function FinancementsPage() {
  const session = await auth();
  const orgId = session?.user?.organismeId ?? null;
  const org = orgId
    ? await prisma.organisme.findUnique({ where: { id: orgId }, select: { wedofApiKey: true } })
    : null;
  const wedofConnecte = !!org?.wedofApiKey;

  const db = await getTenantDb();
  const dossiers = await db.dossierFinancement.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { candidat: { select: { nom: true, prenom: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Landmark className="h-6 w-6 text-primary" /> Financements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suivi des prises en charge CPF (via Wedof) et OPCO — sans ressaisie.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CPF — connexion Wedof</CardTitle>
        </CardHeader>
        <CardContent>
          <WedofConnexion connected={wedofConnecte} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dossiers de financement</CardTitle>
        </CardHeader>
        <CardContent>
          {dossiers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun dossier pour l&apos;instant. Vos dossiers CPF et OPCO s&apos;afficheront ici.
            </p>
          ) : (
            <div className="divide-y">
              {dossiers.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <div className="font-medium">
                      {d.candidat ? `${d.candidat.prenom} ${d.candidat.nom}` : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.type}
                      {d.financeur ? ` · ${d.financeur}` : ""}
                      {d.montant ? ` · ${Number(d.montant).toLocaleString("fr-FR")} €` : ""}
                    </div>
                  </div>
                  <Badge variant="outline">{ETAT_LABEL[d.etat] ?? d.etat}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
