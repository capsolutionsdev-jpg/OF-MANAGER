import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CandidatForm } from "@/components/candidats/candidat-form";

export default function NouveauCandidatPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/candidats"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux candidats
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau candidat</h1>
        <p className="text-sm text-muted-foreground">
          Renseignez les informations du candidat.
        </p>
      </div>

      <div className="max-w-3xl">
        <CandidatForm />
      </div>
    </div>
  );
}
