import { notFound } from "next/navigation";
import { CheckCircle2, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompteRenduForm } from "@/components/compte-rendu/compte-rendu-form";

export const dynamic = "force-dynamic";

export default async function CompteRenduPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const s = await prisma.session.findUnique({
    where: { crFormateurToken: token },
    include: { formation: true, formateurs: true },
  });
  if (!s) notFound();
  const org = await orgConfigFor(s.organismeId);

  const done = !!s.crFormateurCompletedAt;
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const formateur = s.formateurs[0];

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={org.logoUrl ?? "/cap-competences-logo.png"}
            alt={org.name}
            className="mb-3 h-12 w-auto object-contain"
          />
          <h1 className="text-xl font-bold">Compte rendu pédagogique</h1>
          <p className="text-sm text-muted-foreground">
            {s.formation.titre} — du {fmt(s.dateDebut)} au {fmt(s.dateFin)}
          </p>
        </div>

        {done ? (
          <Card>
            <CardContent className="space-y-3 py-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="font-medium">Merci, votre compte rendu est enregistré.</p>
              <a
                href={`/compte-rendu/${token}/document`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                <Download className="h-4 w-4" /> Voir mon compte rendu (PDF)
              </a>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Bonjour {formateur ? formateur.prenom : ""}, merci de remplir ce
                compte rendu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CompteRenduForm token={token} />
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
