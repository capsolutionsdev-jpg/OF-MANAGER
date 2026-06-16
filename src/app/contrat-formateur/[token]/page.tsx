import { notFound } from "next/navigation";
import { CheckCircle2, Download, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContratSignPad } from "@/components/contrat/contrat-sign-pad";

export const dynamic = "force-dynamic";

export default async function ContratFormateurPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const s = await prisma.session.findUnique({
    where: { contratFormateurToken: token },
    include: { formation: true, formateurs: true },
  });
  if (!s) notFound();
  const org = await orgConfigFor(s.organismeId);

  const f = s.formateurs[0];
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const signed = !!s.contratFormateurSignedAt;

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
          <h1 className="text-xl font-bold">Contrat de sous-traitance</h1>
          <p className="text-sm text-muted-foreground">
            {s.formation.titre} — du {fmt(s.dateDebut)} au {fmt(s.dateFin)}
          </p>
        </div>

        {signed ? (
          <Card>
            <CardContent className="space-y-3 py-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="font-medium">
                Contrat signé le {s.contratFormateurSignedAt!.toLocaleString("fr-FR")}.
              </p>
              <a
                href={`/contrat-formateur/${token}/document`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                <Download className="h-4 w-4" /> Télécharger le contrat signé (PDF)
              </a>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Bonjour {f ? f.prenom : ""}, votre contrat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={`/contrat-formateur/${token}/document`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" /> Lire le contrat (PDF) avant de
                  signer
                </a>
              </CardContent>
            </Card>
            <ContratSignPad token={token} />
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {org.name} — {org.email}
        </p>
      </div>
    </main>
  );
}
