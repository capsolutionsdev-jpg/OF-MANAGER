import { Calculator } from "lucide-react";
import { SimulateurFinancement } from "@/components/financement/simulateur-financement";

export default async function SimulateurFinancementPage({
  searchParams,
}: {
  searchParams: Promise<{ prenom?: string; nom?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Calculator className="h-6 w-6" /> Simulateur de financement
        </h1>
        <p className="text-sm text-muted-foreground">
          Identifiez les dispositifs de financement mobilisables selon le profil du prospect, avec
          la procédure de montage et le dossier administratif de chacun.
        </p>
      </div>
      <SimulateurFinancement prenom={sp.prenom} nom={sp.nom} />
    </div>
  );
}
