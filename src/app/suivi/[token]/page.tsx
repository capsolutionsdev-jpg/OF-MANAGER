import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuiviForm } from "@/components/parcours/suivi-form";

export const dynamic = "force-dynamic";

export default async function SuiviPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const insc = await prisma.inscription.findFirst({
    where: { suivi6moisToken: token },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc) notFound();
  const org = await orgConfigFor(insc.organismeId);
  const done = !!insc.suivi6moisCompletedAt;

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cap-competences-logo.png" alt={org.name} className="mb-3 h-12 w-auto object-contain" />
          <h1 className="text-xl font-bold">Suivi à 6 mois</h1>
          <p className="text-sm text-muted-foreground">
            Formation « {insc.session.formation.titre} »
          </p>
        </div>

        {done ? (
          <Card>
            <CardContent className="space-y-2 py-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="font-medium">Merci pour votre réponse !</p>
              <p className="text-sm text-muted-foreground">
                Vos informations nous aident à améliorer nos formations et à respecter
                nos engagements qualité (Qualiopi).
              </p>
              <a href={`/suivi/${token}/document`} target="_blank" rel="noopener"
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                Voir ma fiche de suivi (PDF)
              </a>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Bonjour {insc.candidat.prenom}, où en êtes-vous 6 mois après votre formation ?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Ce court questionnaire (2 minutes) nous permet de mesurer le devenir
                professionnel de nos stagiaires, dans le cadre de notre démarche qualité.
              </p>
              <SuiviForm token={token} />
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">{org.name} — {org.email}</p>
      </div>
    </main>
  );
}
