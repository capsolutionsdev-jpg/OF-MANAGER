import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SessionForm } from "@/components/sessions/session-form";

export default async function ModifierSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [s, formations] = await Promise.all([
    prisma.session.findUnique({ where: { id } }),
    prisma.formation.findMany({
      where: { isArchived: false },
      orderBy: { titre: "asc" },
      select: { id: true, titre: true, reference: true },
    }),
  ]);
  if (!s) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/sessions/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la session
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Modifier la session</h1>
      </div>

      <div className="max-w-3xl">
        <SessionForm
          formations={formations}
          sessionId={s.id}
          defaultValues={{
            formationId: s.formationId,
            reference: s.reference ?? "",
            dateDebut: s.dateDebut.toISOString().slice(0, 10),
            dateFin: s.dateFin.toISOString().slice(0, 10),
            horaires: s.horaires ?? "",
            lieu: s.lieu ?? "",
            modalite: s.modalite,
            nbPlaces: String(s.nbPlaces),
            statut: s.statut,
          }}
        />
      </div>
    </div>
  );
}
