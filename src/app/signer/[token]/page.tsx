import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, FileText, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfig } from "@/lib/org-config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignBox } from "@/components/parcours/sign-box";

export const dynamic = "force-dynamic";

// Documents soumis à signature du stagiaire
const A_SIGNER = [
  "Fiche d'inscription",
  "Convention de formation",
  "Règlement intérieur",
];

export default async function SignerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const insc = await prisma.inscription.findUnique({
    where: { accessToken: token },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc) notFound();

  const c = insc.candidat;
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

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
          <h1 className="text-xl font-bold">Signature de vos documents</h1>
          <p className="text-sm text-muted-foreground">
            {insc.session.formation.titre} — du {fmt(insc.session.dateDebut)} au{" "}
            {fmt(insc.session.dateFin)}
          </p>
        </div>

        {insc.signedAt ? (
          <Card>
            <CardContent className="space-y-3 py-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="font-medium">
                Documents signés le {insc.signedAt.toLocaleString("fr-FR")}.
              </p>
              <a
                href={`/parcours/${token}/documents`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                <Download className="h-4 w-4" /> Télécharger mes documents
              </a>
              <div>
                <Link
                  href={`/parcours/${token}`}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  ← Retour à mon parcours
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : !insc.formCompletedAt ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Merci de compléter d&apos;abord vos informations.{" "}
              <Link href={`/parcours/${token}`} className="text-primary underline">
                Revenir au formulaire
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5" /> Documents à signer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1.5 text-sm">
                  {A_SIGNER.map((d) => (
                    <li key={d} className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {d}
                    </li>
                  ))}
                </ul>
                <a
                  href={`/parcours/${token}/documents`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Download className="h-4 w-4" /> Aperçu de l&apos;ensemble des
                  documents (.zip)
                </a>
              </CardContent>
            </Card>

            <SignBox token={token} defaultName={`${c.prenom} ${c.nom}`} />
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {orgConfig.name} — {orgConfig.email} · {orgConfig.telephone}
        </p>
      </div>
    </main>
  );
}
