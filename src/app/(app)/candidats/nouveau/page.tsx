import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { CandidatForm } from "@/components/candidats/candidat-form";

export const dynamic = "force-dynamic";

export default async function NouveauCandidatPage() {
  const db = await getTenantDb();
  const [formations, collaborateurs] = await Promise.all([
    db.formation.findMany({
      where: { isArchived: false },
      select: { id: true, titre: true },
      orderBy: { titre: "asc" },
    }),
    db.user.findMany({
      where: {
        isActive: true,
        role: { in: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"] },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/candidats"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux candidats
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau candidat</h1>
        <p className="text-sm text-muted-foreground">
          Renseignez les informations du candidat.
        </p>
      </div>

      <div className="max-w-3xl">
        <CandidatForm formations={formations} collaborateurs={collaborateurs} />
      </div>
    </div>
  );
}
