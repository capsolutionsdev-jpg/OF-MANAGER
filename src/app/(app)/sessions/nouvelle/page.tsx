import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SessionForm } from "@/components/sessions/session-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function NouvelleSessionPage() {
  const formations = await prisma.formation.findMany({
    where: { isArchived: false },
    orderBy: { titre: "asc" },
    select: { id: true, titre: true, reference: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sessions"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux sessions
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nouvelle session</h1>
      </div>

      <div className="max-w-3xl">
        {formations.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Vous devez d&apos;abord créer une formation au catalogue.{" "}
            <Link href="/formations/nouvelle" className="text-primary hover:underline">
              Créer une formation
            </Link>
          </Card>
        ) : (
          <SessionForm formations={formations} />
        )}
      </div>
    </div>
  );
}
