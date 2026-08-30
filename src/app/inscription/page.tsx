import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getOrganismeFromHost } from "@/lib/tenant-host";
import { PublicInscriptionForm } from "@/components/public/public-inscription-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Inscription — OFManager",
  description: "Formulaire d'inscription à nos formations.",
};

// Liste les sessions ouvertes depuis la base → rendu dynamique (pas de build).
export const dynamic = "force-dynamic";

export default async function PublicInscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ organisme?: string }>;
}) {
  // Cloisonnement multi-tenant (audit A05-003) : ne lister QUE les sessions de
  // l'organisme résolu — param `?organisme=`, sinon sous-domaine de la requête,
  // sinon l'env VITRINE_ORGANISME_ID. Sans organisme identifiable → aucune
  // session (on ne fuit jamais le planning de tous les OF).
  const sp = await searchParams;
  const orgFromHost = await getOrganismeFromHost();
  const organismeId =
    sp?.organisme?.trim() || orgFromHost?.id || process.env.VITRINE_ORGANISME_ID || null;

  const sessions = organismeId
    ? await prisma.session.findMany({
        where: { organismeId, statut: { in: ["PLANIFIEE", "OUVERTE"] } },
        include: { formation: true },
        orderBy: { dateDebut: "asc" },
      })
    : [];

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
          <h1 className="text-xl font-bold">OFManager</h1>
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
