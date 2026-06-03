import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfig } from "@/lib/org-config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SatisfactionForm } from "@/components/parcours/satisfaction-form";

export const dynamic = "force-dynamic";

export default async function SatisfactionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const insc = await prisma.inscription.findUnique({
    where: { satisfactionToken: token },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc) notFound();

  const done = !!insc.satisfactionCompletedAt;

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cap-competences-logo.png"
            alt={orgConfig.name}
            className="mb-3 h-12 w-auto object-contain"
          />
          <h1 className="text-xl font-bold">Votre avis nous intéresse</h1>
          <p className="text-sm text-muted-foreground">
            Formation « {insc.session.formation.titre} »
          </p>
        </div>

        {done ? (
          <Card>
            <CardContent className="space-y-2 py-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="font-medium">Merci pour votre retour !</p>
              <p className="text-sm text-muted-foreground">
                Votre évaluation signée a bien été enregistrée.
              </p>
              <a
                href={`/satisfaction/${token}/document`}
                target="_blank"
                rel="noopener"
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Voir ma fiche de satisfaction (PDF)
              </a>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Bonjour {insc.candidat.prenom}, évaluez votre formation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SatisfactionForm token={token} />
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {orgConfig.name} — {orgConfig.email}
        </p>
      </div>
    </main>
  );
}
