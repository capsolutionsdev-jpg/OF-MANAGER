import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListChecks } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { questionsPourFormation } from "@/lib/positionnement";
import { PositionnementEditor } from "@/components/formations/positionnement-editor";

export const dynamic = "force-dynamic";

export default async function PositionnementFormationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await getTenantDb();
  const { id } = await params;
  const formation = await db.formation.findUnique({
    where: { id },
    select: { id: true, titre: true, positionnementQuestions: true },
  });
  if (!formation) notFound();

  const estPersonnalise =
    Array.isArray(formation.positionnementQuestions) &&
    formation.positionnementQuestions.length > 0;
  const questions = questionsPourFormation(
    formation.titre,
    formation.positionnementQuestions,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/formations/${formation.id}`}
          className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Fiche formation
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ListChecks className="h-6 w-6 text-primary" /> Test de positionnement
        </h1>
        <p className="text-sm text-muted-foreground">{formation.titre}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions du test</CardTitle>
          <CardDescription>
            Ces questions sont envoyées par lien au candidat le 1er jour de la
            formation (vers 9h). Il répond, signe, et ses réponses sont conservées
            dans son dossier de session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PositionnementEditor
            formationId={formation.id}
            initial={questions}
            estPersonnalise={estPersonnalise}
          />
        </CardContent>
      </Card>
    </div>
  );
}
