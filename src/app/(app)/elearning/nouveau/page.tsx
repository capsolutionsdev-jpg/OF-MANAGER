import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CoursForm } from "@/components/elearning/cours-form";

export const dynamic = "force-dynamic";

export default async function NouveauCoursPage() {
  const formations = await prisma.formation.findMany({
    where: { isArchived: false },
    select: { id: true, titre: true, academy: true },
    orderBy: { titre: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/elearning"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;e-learning
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau cours</h1>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <CoursForm formations={formations} />
        </CardContent>
      </Card>
    </div>
  );
}
