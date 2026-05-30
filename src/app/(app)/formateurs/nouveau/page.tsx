import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FormateurForm } from "@/components/formateurs/formateur-form";

export default async function NouveauFormateurPage() {
  const formations = await prisma.formation.findMany({
    where: { isArchived: false },
    orderBy: { titre: "asc" },
    select: { id: true, titre: true, academy: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/formateurs"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux formateurs
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau formateur</h1>
      </div>
      <div className="max-w-3xl">
        <FormateurForm formations={formations} />
      </div>
    </div>
  );
}
