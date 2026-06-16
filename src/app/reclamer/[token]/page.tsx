import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReclamationForm } from "@/components/parcours/reclamation-form";

export const dynamic = "force-dynamic";

export default async function ReclamerPage({
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
  const org = await orgConfigFor(insc.organismeId);

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
          <h1 className="text-xl font-bold">Fiche de réclamation</h1>
          <p className="text-sm text-muted-foreground">
            Formation « {insc.session.formation.titre} »
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {insc.candidat.prenom}, exprimez votre réclamation
            </CardTitle>
            <CardDescription>
              Toute réclamation est enregistrée dans notre registre qualité,
              analysée et traitée : accusé de réception sous 5 jours ouvrés,
              réponse argumentée sous 15 jours ouvrés.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReclamationForm token={token} />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {org.name} — {org.email}
        </p>
      </div>
    </main>
  );
}
