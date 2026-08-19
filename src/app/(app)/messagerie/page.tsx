import { MessageSquare } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { getCurrentApprenant } from "@/lib/candidat-portal";
import { getBranding } from "@/lib/org";
import { Card, CardContent } from "@/components/ui/card";
import { MessagerieCandidat } from "@/components/portail/messagerie-candidat";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function MessageriePage() {
  const apprenant = await getCurrentApprenant();
  if (!apprenant) {
    return (
      <div className="space-y-4">
        <PageHeader title="Messagerie" />
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Aucun dossier candidat associé.</CardContent></Card>
      </div>
    );
  }

  const db = await getTenantDb();
  const [messages, branding] = await Promise.all([
    db.candidatMessage.findMany({
      where: { candidatId: apprenant.candidatId },
      orderBy: { createdAt: "asc" },
      select: { id: true, corps: true, deCandidat: true, auteurNom: true, createdAt: true },
    }),
    getBranding(),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Messagerie" subtitle="Échangez avec votre organisme de formation." icon={MessageSquare} />
      <MessagerieCandidat
        orgNom={branding.nom}
        messages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      />
    </div>
  );
}
