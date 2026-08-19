import { PenLine } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { Card, CardContent } from "@/components/ui/card";
import { EmargementSignList, type EmargementItem } from "@/components/apprenant/emargement-sign-list";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function MesEmargementsPage() {
  const db = await getTenantDb();
  const session = await auth();
  const apprenant = session?.user?.id
    ? await db.apprenant.findUnique({ where: { userId: session.user.id }, select: { candidatId: true } })
    : null;

  if (!apprenant) {
    return (
      <div className="space-y-4">
        <PageHeader title="Mes émargements" icon={PenLine} />
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Aucun espace apprenant associé à ce compte. Contactez votre organisme de formation.
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = await db.emargementSignature.findMany({
    where: { candidatId: apprenant.candidatId },
    orderBy: [{ date: "asc" }, { demi: "asc" }],
    select: {
      id: true, date: true, demi: true, signedAt: true,
      session: { select: { formation: { select: { titre: true } } } },
    },
  });

  const items: EmargementItem[] = rows.map((r) => ({
    id: r.id,
    dateLabel: r.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
    demiLabel: r.demi === "MATIN" ? "Matin" : "Après-midi",
    formation: r.session.formation.titre,
    signed: !!r.signedAt,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Mes émargements" subtitle="Signez vos feuilles de présence par demi-journée, directement en ligne." icon={PenLine} />

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Aucune feuille d&apos;émargement n&apos;est encore disponible pour votre formation.
          </CardContent>
        </Card>
      ) : (
        <EmargementSignList items={items} />
      )}
    </div>
  );
}
