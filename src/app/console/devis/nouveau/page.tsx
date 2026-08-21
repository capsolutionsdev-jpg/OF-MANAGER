import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { getResolvedPlans } from "@/lib/pricing";
import { PLAN_ORDER } from "@/lib/plans";
import { DevisBuilder } from "@/components/console/devis-builder";

export const dynamic = "force-dynamic";

export default async function NouveauDevisPage() {
  await requireSuperAdmin();
  const [organismes, { plans }] = await Promise.all([
    prisma.organisme.findMany({
      where: { isDemo: false },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
    getResolvedPlans(),
  ]);
  const plansArr = PLAN_ORDER.map((k) => ({ key: k, name: plans[k].name, price: plans[k].price }));

  return (
    <div className="space-y-5">
      <Link
        href="/console/devis"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Devis & contrats
      </Link>
      <PageHeader
        title="Nouveau devis"
        subtitle="Palier, options, packs métier et offre de lancement — total calculé en direct."
      />
      <DevisBuilder organismes={organismes} plans={plansArr} />
    </div>
  );
}
