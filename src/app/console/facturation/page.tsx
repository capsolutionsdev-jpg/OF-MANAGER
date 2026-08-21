import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { FacturationConsole, type FactureConsoleRow } from "@/components/console/facturation-console";

export const dynamic = "force-dynamic";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export default async function FacturationPage() {
  await requireSuperAdmin();
  const [factures, organismes] = await Promise.all([
    prisma.factureEditeur.findMany({
      orderBy: { createdAt: "desc" },
      include: { organisme: { select: { id: true, nom: true } } },
    }),
    prisma.organisme.findMany({
      where: { isDemo: false },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  const rows: FactureConsoleRow[] = factures.map((f) => {
    const d = new Date(f.periodeDebut);
    return {
      id: f.id,
      numero: f.numero,
      statut: f.statut,
      periodeLabel: `${MOIS[d.getMonth()]} ${d.getFullYear()}`,
      montantTTC: Number(f.montantTTC),
      client: f.organisme.nom,
      organismeId: f.organisme.id,
    };
  });

  const enAttente = factures.filter((f) => f.statut === "EMISE" || f.statut === "DEPOSEE").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Facturation"
        subtitle={`${factures.length} facture${factures.length > 1 ? "s" : ""}${enAttente ? ` · ${enAttente} en attente d'encaissement` : ""}`}
      />
      <FacturationConsole factures={rows} organismes={organismes} />
    </div>
  );
}
