import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CreateOrganismeForm } from "@/components/console/create-organisme-form";
import { getPlanPrices } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function NouvelOrganismePage() {
  const prices = await getPlanPrices();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/console/organismes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux organismes
      </Link>
      <PageHeader
        title="Nouvel organisme"
        subtitle="Créez l'instance d'un organisme de formation client et son compte gérant"
      />
      <CreateOrganismeForm prices={prices} />
    </div>
  );
}
