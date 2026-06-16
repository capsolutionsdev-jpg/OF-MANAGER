import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SatisfactionEntrepriseForm } from "@/components/parcours/satisfaction-entreprise-form";

export const dynamic = "force-dynamic";

export default async function SatisfactionEntreprisePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const insc = await prisma.inscription.findUnique({
    where: { satisfactionEntrepriseToken: token },
    include: {
      candidat: { include: { entreprise: true } },
      session: { include: { formation: true } },
    },
  });
  if (!insc) notFound();
  const org = await orgConfigFor(insc.organismeId);

  const done = !!insc.satisfactionEntrepriseCompletedAt;
  const ent = insc.candidat.entreprise;

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cap-competences-logo.png"
            alt={org.name}
            className="mb-3 h-12 w-auto object-contain"
          />
          <h1 className="text-xl font-bold">Évaluation de la prestation — entreprise</h1>
          <p className="text-sm text-muted-foreground">
            Formation « {insc.session.formation.titre} » suivie par {insc.candidat.prenom}{" "}
            {insc.candidat.nom}
            {ent ? ` — ${ent.raisonSociale}` : ""}
          </p>
        </div>

        {done ? (
          <Card>
            <CardContent className="space-y-2 py-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="font-medium">Merci pour votre retour !</p>
              <p className="text-sm text-muted-foreground">
                Votre évaluation signée a bien été enregistrée le{" "}
                {insc.satisfactionEntrepriseCompletedAt!.toLocaleDateString("fr-FR")}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Votre appréciation</CardTitle>
              <CardDescription>
                Ce questionnaire alimente notre démarche qualité (Qualiopi). Merci de
                noter chaque critère puis de signer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SatisfactionEntrepriseForm token={token} />
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {org.name} — {org.email}
        </p>
      </div>
    </main>
  );
}
