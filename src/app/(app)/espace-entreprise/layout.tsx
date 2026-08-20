import { redirect } from "next/navigation";
import { getCurrentEntreprise } from "@/lib/entreprise-portal";

export const dynamic = "force-dynamic";

export default async function EspaceEntrepriseLayout({ children }: { children: React.ReactNode }) {
  const entreprise = await getCurrentEntreprise();
  if (!entreprise) redirect("/login");
  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6 border-b pb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Espace client</p>
        <h1 className="text-xl font-bold">{entreprise.raisonSociale}</h1>
      </header>
      {children}
    </div>
  );
}
