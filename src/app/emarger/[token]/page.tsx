import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import { salleToken } from "@/lib/emargement-salle";
import { Card, CardContent } from "@/components/ui/card";
import { EmargerSignButton } from "@/components/emargement/emarger-sign-button";

export const dynamic = "force-dynamic";

export default async function EmargerPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { token } = await params;
  const { s: fromSession } = await searchParams;
  const row = await prisma.emargementSignature.findUnique({
    where: { token },
    include: { session: { include: { formation: true } } },
  });
  if (!row) notFound();
  const org = await orgConfigFor(row.organismeId);

  // Mode « borne en salle » : si on vient de la page salle de CETTE session,
  // on propose de revenir à la liste pour la personne suivante.
  const salleUrl =
    fromSession && fromSession === row.sessionId
      ? `/emarger/salle/${row.sessionId}/${salleToken(row.sessionId)}`
      : null;

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
            src={org.logoUrl ?? "/ofmanager-logo.png"}
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

        {salleUrl && (
          <Link
            href={salleUrl}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-medium ${
              row.signedAt
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            {row.signedAt ? "Personne suivante" : "Retour à la liste"}
          </Link>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {org.name} — {org.email}
        </p>
      </div>
    </main>
  );
}
