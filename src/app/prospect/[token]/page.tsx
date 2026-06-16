import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProspectForm } from "@/components/prospect/prospect-form";

export const dynamic = "force-dynamic";

export default async function ProspectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const c = await prisma.candidat.findUnique({
    where: { prospectToken: token },
  });
  if (!c) notFound();
  const org = await orgConfigFor(c.organismeId);

  const formations = await prisma.formation.findMany({
    where: { isArchived: false },
    select: { id: true, titre: true },
    orderBy: { titre: "asc" },
  });

  const done = !!c.prospectFormCompletedAt;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 py-10">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cap-competences-logo.png"
          alt={org.name}
          className="h-12 w-auto"
        />
        <div>
          <p className="font-semibold">{org.name}</p>
          <p className="text-xs text-muted-foreground">{org.qualiopi}</p>
        </div>
      </div>

      {done ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <h1 className="text-xl font-bold">Votre fiche a bien été enregistrée</h1>
            <p className="text-sm text-muted-foreground">
              Merci {c.prenom} {c.nom}. Notre équipe revient vers vous pour la
              suite de votre inscription.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Fiche d&apos;inscription — {c.prenom} {c.nom}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Complétez vos informations, choisissez votre formation puis signez
              votre fiche ci-dessous.
            </p>
          </CardHeader>
          <CardContent>
            <ProspectForm
              token={token}
              formations={formations}
              defaults={{
                telephone: c.telephone ?? "",
                dateNaissance: c.dateNaissance
                  ? c.dateNaissance.toISOString().slice(0, 10)
                  : "",
                lieuNaissance: c.lieuNaissance ?? "",
                paysNaissance: c.paysNaissance ?? "",
                adresse: c.adresse ?? "",
                codePostal: c.codePostal ?? "",
                ville: c.ville ?? "",
                pays: c.pays ?? "France",
                situationPro: c.situationPro ?? "",
                employeur: c.employeur ?? "",
                posteOccupe: c.posteOccupe ?? "",
                dernierDiplome: c.dernierDiplome ?? "",
                sourceConnaissance: c.sourceConnaissance ?? "",
                formationSouhaiteeId: c.formationSouhaiteeId ?? "",
                financementType: c.financementType ?? "",
              }}
            />
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {org.name} — SIRET {org.siret} · NDA {org.nda}
      </p>
    </div>
  );
}
