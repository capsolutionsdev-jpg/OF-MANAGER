import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, FileText, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import { linkExpired } from "@/lib/token";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignBox } from "@/components/parcours/sign-box";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Documents soumis à signature du stagiaire
const A_SIGNER = [
  "Fiche d'inscription",
  "Contrat de formation",
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
  // Correctif audit P3 : un lien de signature fuité ne reste pas valable
  // indéfiniment (cohérent avec /parcours) — 12 mois après la fin de session.
  if (linkExpired(insc.session?.dateFin)) notFound();
  const org = await orgConfigFor(insc.organismeId);

  const c = insc.candidat;
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

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
                  href={`/parcours/${token}/documents?preview=1`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <Download className="h-4 w-4" /> Lire les documents (PDF) avant
                  de signer
                </a>
              </CardContent>
            </Card>

            <SignBox token={token} defaultName={`${c.prenom} ${c.nom}`} />
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {org.name} — {org.email} · {org.telephone}
        </p>
      </div>
    </main>
  );
}
