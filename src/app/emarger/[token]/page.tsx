import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import { Card, CardContent } from "@/components/ui/card";
import { EmargerSignButton } from "@/components/emargement/emarger-sign-button";

export const dynamic = "force-dynamic";

export default async function EmargerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const row = await prisma.emargementSignature.findUnique({
    where: { token },
    include: { session: { include: { formation: true } } },
  });
  if (!row) notFound();
  const org = await orgConfigFor(row.organismeId);

  const demiLabel = row.demi === "MATIN" ? "Matin" : "Après-midi";
  const jour = row.date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={org.logoUrl ?? "/cap-competences-logo.png"}
            alt={org.name}
            className="mb-3 h-12 w-auto object-contain"
          />
          <h1 className="text-xl font-bold">Émargement</h1>
          <p className="text-sm text-muted-foreground">
            {row.session.formation.titre}
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 py-6">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Participant</dt>
                <dd className="font-medium">{row.nom}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Rôle</dt>
                <dd>{row.role === "FORMATEUR" ? "Formateur" : "Stagiaire"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Jour</dt>
                <dd className="capitalize">{jour}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Demi-journée</dt>
                <dd>{demiLabel}</dd>
              </div>
            </dl>

            {row.signedAt ? (
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <CheckCircle2 className="mx-auto mb-1 h-8 w-8 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700">
                  Présence signée le {row.signedAt.toLocaleString("fr-FR")}.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  En cliquant, vous attestez votre présence à cette demi-journée.
                  Votre signature électronique (horodatage + IP) a valeur de
                  signature manuscrite.
                </p>
                <EmargerSignButton token={token} />
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {org.name} — {org.email}
        </p>
      </div>
    </main>
  );
}
