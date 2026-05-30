import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CandidatForm } from "@/components/candidats/candidat-form";

export default async function ModifierCandidatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await prisma.candidat.findUnique({ where: { id } });
  if (!c) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/candidats/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la fiche
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Modifier — {c.prenom} {c.nom}
        </h1>
      </div>

      <div className="max-w-3xl">
        <CandidatForm
          candidatId={c.id}
          defaultValues={{
            nom: c.nom,
            prenom: c.prenom,
            email: c.email,
            telephone: c.telephone ?? "",
            dateNaissance: c.dateNaissance
              ? c.dateNaissance.toISOString().slice(0, 10)
              : "",
            adresse: c.adresse ?? "",
            ville: c.ville ?? "",
            codePostal: c.codePostal ?? "",
            pays: c.pays ?? "France",
            situationPro: c.situationPro ?? "",
            employeur: c.employeur ?? "",
            posteOccupe: c.posteOccupe ?? "",
            financementType: c.financementType ?? undefined,
            statut: c.statut,
          }}
        />
      </div>
    </div>
  );
}
