import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { DevisForm } from "@/components/devis/devis-form";

export const dynamic = "force-dynamic";

export default async function NouveauDevisPage() {
  await requireSection("facturation");
  const db = await getTenantDb();
  const entreprises = await db.entreprise.findMany({
    orderBy: { raisonSociale: "asc" },
    select: { id: true, raisonSociale: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/devis"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux devis
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau devis</h1>
      </div>
      <div className="max-w-3xl">
        <DevisForm entreprises={entreprises} />
      </div>
    </div>
  );
}
