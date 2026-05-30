import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PublicInscriptionForm } from "@/components/public/public-inscription-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Inscription — CAP Compétences",
  description: "Formulaire d'inscription à nos formations.",
};

export default async function PublicInscriptionPage() {
  const sessions = await prisma.session.findMany({
    where: { statut: { in: ["PLANIFIEE", "OUVERTE"] } },
    include: { formation: true },
    orderBy: { dateDebut: "asc" },
  });

  const options = sessions.map((s) => ({
    id: s.id,
    label: `${s.formation.titre} — ${s.dateDebut.toLocaleDateString("fr-FR")}${
      s.lieu ? ` (${s.lieu})` : ""
    }`,
  }));

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">CAP Compétences</h1>
          <p className="text-sm text-muted-foreground">
            Organisme de formation certifié Qualiopi
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demande d&apos;inscription</CardTitle>
            <CardDescription>
              Remplissez ce formulaire pour vous pré-inscrire à une formation.
              Notre équipe vous recontactera pour finaliser votre dossier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PublicInscriptionForm sessions={options} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
