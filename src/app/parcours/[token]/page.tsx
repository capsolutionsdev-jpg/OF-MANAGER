import { notFound } from "next/navigation";
import { CheckCircle2, Circle, FileSignature } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParcoursForm } from "@/components/parcours/parcours-form";

export const dynamic = "force-dynamic";

function Step({
  done,
  current,
  label,
}: {
  done: boolean;
  current: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      ) : (
        <Circle
          className={`h-5 w-5 ${current ? "text-primary" : "text-muted-foreground"}`}
        />
      )}
      <span
        className={`text-sm ${
          current ? "font-semibold" : done ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default async function ParcoursPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const insc = await prisma.inscription.findUnique({
    where: { accessToken: token },
    include: {
      candidat: true,
      session: { include: { formation: true } },
    },
  });
  if (!insc) notFound();
  const org = await orgConfigFor(insc.organismeId);

  const c = insc.candidat;
  const formDone = !!insc.formCompletedAt;
  const signed = !!insc.signedAt;
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* En-tête */}
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cap-competences-logo.png"
            alt={org.name}
            className="mb-3 h-12 w-auto object-contain"
          />
          <h1 className="text-xl font-bold">
            Finalisez votre inscription
          </h1>
          <p className="text-sm text-muted-foreground">
            {insc.session.formation.titre} — du {fmt(insc.session.dateDebut)} au{" "}
            {fmt(insc.session.dateFin)}
          </p>
        </div>

        {/* Progression */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-4">
            <Step done={formDone} current={!formDone} label="1. Mes informations" />
            <Step
              done={signed}
              current={formDone && !signed}
              label="2. Signature des documents"
            />
            <Step done={false} current={signed} label="3. Réception des documents" />
          </CardContent>
        </Card>

        {/* Étape courante */}
        {!formDone ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Bonjour {c.prenom}, complétez vos informations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ParcoursForm
                token={token}
                defaults={{
                  telephone: c.telephone ?? "",
                  dateNaissance: c.dateNaissance
                    ? c.dateNaissance.toISOString().slice(0, 10)
                    : "",
                  adresse: c.adresse ?? "",
                  codePostal: c.codePostal ?? "",
                  ville: c.ville ?? "",
                  situationPro: c.situationPro ?? "",
                  employeur: c.employeur ?? "",
                  financementType: insc.financementType ?? "",
                }}
              />
            </CardContent>
          </Card>
        ) : !signed ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSignature className="h-5 w-5 text-primary" /> Signez vos
                documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Merci ! Vos informations sont enregistrées. Dernière étape :
                relisez et signez électroniquement vos documents (fiche
                d&apos;inscription, convention, règlement intérieur).
              </p>
              <a
                href={`/signer/${token}`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                <FileSignature className="h-4 w-4" />
                Lire et signer mes documents
              </a>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-2 py-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="font-medium">Tout est finalisé, merci !</p>
              <p className="text-sm text-muted-foreground">
                Vos documents signés vous ont été envoyés par e-mail. Vous
                recevrez prochainement votre convocation.
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {org.name} — {org.email} · {org.telephone}
        </p>
      </div>
    </main>
  );
}
