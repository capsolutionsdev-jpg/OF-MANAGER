import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormationForm } from "@/components/formations/formation-form";

export default function NouvelleFormationPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/formations"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au catalogue
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nouvelle formation</h1>
      </div>

      <div className="max-w-3xl">
        <FormationForm />
      </div>
    </div>
  );
}
