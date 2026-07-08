import { MessageSquare } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { getCurrentApprenant } from "@/lib/candidat-portal";
import { getBranding } from "@/lib/org";
import { Card, CardContent } from "@/components/ui/card";
import { MessagerieCandidat } from "@/components/portail/messagerie-candidat";

export const dynamic = "force-dynamic";

export default async function MessageriePage() {
  const apprenant = await getCurrentApprenant();
  if (!apprenant) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Messagerie</h1>
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
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <MessageSquare className="h-6 w-6" /> Messagerie
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Échangez avec votre organisme de formation.</p>
      </div>
      <MessagerieCandidat
        orgNom={branding.nom}
        messages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      />
    </div>
  );
}
