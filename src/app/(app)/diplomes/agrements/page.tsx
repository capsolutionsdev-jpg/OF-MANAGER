import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { orgConfigFor } from "@/lib/org-identity";
import { readAgrements } from "@/lib/agrements";
import { PageHeader } from "@/components/ui/page-header";
import { AgrementsForm } from "@/components/agrements/agrements-form";

export const dynamic = "force-dynamic";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION"];

/** Réglage des agréments de l'organisme (un par famille de formations). */
export default async function AgrementsPage() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId) redirect("/dashboard");

  const org = await orgConfigFor(organismeId);
  const initial = readAgrements(org.documentsConfig);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/diplomes"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux diplômes
        </Link>
        <PageHeader
          title="Agréments & autorisations"
          subtitle="Numéros d'agrément de l'organisme, par famille de formations. Ils figurent sur les documents délivrés et composent le numéro des diplômes SSIAP."
        />
      </div>

      <AgrementsForm initial={initial} />
    </div>
  );
}
