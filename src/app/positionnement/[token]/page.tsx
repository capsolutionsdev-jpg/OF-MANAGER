import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import { linkExpired } from "@/lib/token";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { questionsPourFormation } from "@/lib/positionnement";
import { PositionnementForm } from "@/components/parcours/positionnement-form";

export const dynamic = "force-dynamic";

export default async function PositionnementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const insc = await prisma.inscription.findUnique({
    where: { positionnementToken: token },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc) notFound();
  // Lien d'enquête expiré (~180 j après la fin de session). §magic-links
  if (linkExpired(insc.session?.dateFin, 6)) notFound();
  const org = await orgConfigFor(insc.organismeId);

  const f = insc.session.formation;
  const questions = questionsPourFormation(f.titre, f.positionnementQuestions);
  const done = !!insc.positionnementCompletedAt;
  const reponses = (insc.positionnementJson ?? {}) as Record<string, string | string[]>;

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={org.logoUrl ?? "/ofmanager-logo.png"}
            alt={org.name}
            className="mb-3 h-12 w-auto object-contain"
          />
          <h1 className="text-xl font-bold">Test de positionnement</h1>
          <p className="text-sm text-muted-foreground">
            Formation « {f.titre} » — vos réponses nous aident à adapter le contenu
            et le rythme. Elles restent confidentielles.
          </p>
        </div>

        {done ? (
          <Card>
            <CardContent className="space-y-4 py-8">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="mt-2 font-medium">Test enregistré, merci !</p>
                <p className="text-sm text-muted-foreground">
                  Répondu et signé le {insc.positionnementCompletedAt!.toLocaleDateString("fr-FR")}.
                </p>
              </div>
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                {questions.map((q, i) => (
                  <div key={q.id} className="text-sm">
                    <p className="font-medium">{i + 1}. {q.question}</p>
                    <p className="text-muted-foreground">
                      {Array.isArray(reponses[q.id])
                        ? (reponses[q.id] as string[]).join(", ")
                        : (reponses[q.id] as string) || "—"}
                    </p>
                  </div>
                ))}
                {insc.positionnementSignature && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Signature :</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={insc.positionnementSignature}
                      alt="Signature du stagiaire"
                      className="h-16 rounded border bg-white"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Bonjour {insc.candidat.prenom}, répondez aux {questions.length} questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PositionnementForm token={token} questions={questions} />
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
