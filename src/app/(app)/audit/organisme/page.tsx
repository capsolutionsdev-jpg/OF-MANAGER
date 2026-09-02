import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PiecesOrganismePanel } from "@/components/audit/pieces-organisme-panel";
import type { PieceEtat } from "@/lib/audit/pieces-organisme";

export const dynamic = "force-dynamic";

export default async function PiecesOrganismePage() {
  const session = await auth();
  const organismeId = session?.user?.organismeId ?? null;
  const org = organismeId
    ? await prisma.organisme.findUnique({ where: { id: organismeId }, select: { piecesQualiopi: true } })
    : null;
  const initial = (org?.piecesQualiopi && typeof org.piecesQualiopi === "object"
    ? (org.piecesQualiopi as Record<string, PieceEtat>)
    : {}) as Record<string, PieceEtat>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/audit" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux audits
        </Link>
        <PageHeader
          title="Documents de l'organisme"
          subtitle="Pièces Qualiopi au niveau de l'organisme, demandées lors d'un contrôle (CDC / audit). Enregistrement automatique."
        />
      </div>
      <PiecesOrganismePanel initial={initial} />
    </div>
  );
}
