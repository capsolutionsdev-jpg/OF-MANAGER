import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PricingEditor } from "@/components/console/pricing-editor";
import { getResolvedPlans } from "@/lib/pricing";
import { PLAN_ORDER } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function ConsoleTarifsPage() {
  const { plans, popular } = await getResolvedPlans();
  const ordered = PLAN_ORDER.map((key) => plans[key]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Tarifs des formules"
        subtitle="Le prix, l'accroche et le support de chaque formule — répercutés en direct sur la vitrine publique et le calcul du MRR"
      >
        <Link
          href="/tarifs"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Voir la page Tarifs
        </Link>
      </PageHeader>

      <PricingEditor plans={ordered} popular={popular} />

      <p className="text-xs text-muted-foreground">
        Les fonctionnalités incluses dans chaque formule restent définies dans le code
        (<code>lib/plans.ts</code>) — ici vous pilotez uniquement le prix et l&apos;argumentaire commercial.
      </p>
    </div>
  );
}
