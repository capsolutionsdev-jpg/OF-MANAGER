import { notFound } from "next/navigation";
import { getFormateurDetail } from "@/lib/formateurs/detail";
import { FormateurDetailHeader } from "@/components/formateurs/formateur-detail-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormateurFacturesAdmin,
  type FactureRow,
} from "@/components/formateur/formateur-admin-panels";

export default async function FormateurFacturationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getFormateurDetail(id);
  if (!detail) notFound();

  const { f } = detail;

  const factureRows: FactureRow[] = f.factures.map((x) => ({
    id: x.id,
    reference: x.reference,
    montant: Number(x.montant).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }),
    statut: x.statut,
    fichierUrl: x.fichierUrl ? `/ma-facturation/download?id=${x.id}` : null,
    createdAt: x.createdAt.toLocaleDateString("fr-FR"),
    sessionTitre: x.session?.formation.titre ?? null,
  }));

  return (
    <div className="space-y-6">
      <FormateurDetailHeader
        formateur={{ id: f.id, prenom: f.prenom, nom: f.nom }}
        active="facturation"
        planningCount={f.sessions.length}
        facturesCount={f.factures.length}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Factures du formateur & règlement</CardTitle>
        </CardHeader>
        <CardContent>
          <FormateurFacturesAdmin factures={factureRows} />
        </CardContent>
      </Card>
    </div>
  );
}
